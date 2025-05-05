package main

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/storage"
	"github.com/gin-gonic/gin"
)

var client *torrent.Client
var torrents = make(map[string]*torrent.Torrent)

func init() {
	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = "./downloads" // Make sure this directory exists and is writable
	cfg.NoUpload = false
	cfg.DisableIPv6 = false
	cfg.Seed = false
	cfg.Debug = false
	cfg.DisablePEX = false
	cfg.DefaultStorage = storage.NewFile("./downloads")
	var err error
	client, err = torrent.NewClient(cfg)
	if err != nil {
		panic(err.Error())
	}
}

func main() {
	r := gin.Default()
	r.POST("/add", addTorrent)
	r.GET("/status/:infohash", getTorrentStatus)
	r.GET("/stream/:infohash/:file_idx", streamTorrentFile)
	r.GET("/progress/:infohash/:file_idx", getFileProgress)

	r.Run(":5050")
	print("Server started on port 5050")
}

func addTorrent(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	infoHash := req["infoHash"]
	if infoHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "infoHash is required"})
		return
	}

	torrentFile, err := client.AddMagnet("magnet:?xt=urn:btih:" + infoHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Store under the original infoHash immediately (for fast lookup)
	torrents[infoHash] = torrentFile

	// After metadata, store under canonical infoHash as well
	go func() {
		<-torrentFile.GotInfo()
		canonical := torrentFile.InfoHash().HexString()
		torrents[canonical] = torrentFile
		fmt.Println("Added torrent (canonical):", canonical)
		files := torrentFile.Files()
		if len(files) > 0 {
			// Prioritize the first file for streaming
			files[0].SetPriority(torrent.PiecePriorityNow)
			fmt.Println("Set high priority for file 0:", files[0].Path())
		}
	}()

	c.JSON(http.StatusOK, gin.H{"info_hash": infoHash})
}

func getTorrentByInfoHash(infoHash string) (*torrent.Torrent, bool) {
	t, ok := torrents[infoHash]
	if ok {
		return t, true
	}
	// Try canonical
	for _, v := range torrents {
		if v.InfoHash().HexString() == infoHash {
			return v, true
		}
	}
	return nil, false
}

func getTorrentStatus(c *gin.Context) {
	infoHash := c.Param("infohash")
	torrentFile, exists := getTorrentByInfoHash(infoHash)
	if !exists {
		c.JSON(http.StatusOK, gin.H{"found": false})
		return
	}
	status := torrentFile.Stats()
	c.JSON(http.StatusOK, gin.H{
		"found":          true,
		"TotalPeers":     status.TotalPeers,
		"ActivePeers":    status.ActivePeers,
		"PiecesComplete": status.PiecesComplete,
	})
}

func streamTorrentFile(c *gin.Context) {
	infoHash := c.Param("infohash")
	fileIdxStr := c.Param("file_idx")
	fileIdx, err := strconv.Atoi(fileIdxStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file index"})
		return
	}

	torrentFile, exists := getTorrentByInfoHash(infoHash)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent not found"})
		return
	}

	files := torrentFile.Files()
	if fileIdx < 0 || fileIdx >= len(files) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File index out of range"})
		return
	}

	file := files[fileIdx]
	fileLength := file.Length()

	rangeHeader := c.GetHeader("Range")
	var start, end int64
	if rangeHeader != "" && strings.HasPrefix(rangeHeader, "bytes=") {
		rangeParts := strings.Split(strings.TrimPrefix(rangeHeader, "bytes="), "-")
		start, _ = strconv.ParseInt(rangeParts[0], 10, 64)
		if len(rangeParts) > 1 && rangeParts[1] != "" {
			end, _ = strconv.ParseInt(rangeParts[1], 10, 64)
		} else {
			end = fileLength - 1
		}
		if end >= fileLength {
			end = fileLength - 1
		}
	} else {
		start = 0
		end = fileLength - 1
	}

	length := end - start + 1

	// Wait for metadata
	<-torrentFile.GotInfo()

	// Wait for the first N bytes to be available (e.g., 2MB)
	const minBuffer = 2 * 1024 * 1024 // 2MB
	waitUntil := start + minBuffer
	if waitUntil > fileLength {
		waitUntil = fileLength
	}
	timeout := time.After(30 * time.Second)
	for {
		if file.BytesCompleted() >= waitUntil {
			break
		}
		select {
		case <-timeout:
			c.JSON(http.StatusRequestTimeout, gin.H{"error": "Timeout waiting for buffer"})
			return
		case <-time.After(500 * time.Millisecond):
		}
	}

	mimeType := mime.TypeByExtension(filepath.Ext(file.Path()))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	c.Header("Content-Type", mimeType)

	reader := file.NewReader()
	defer reader.Close()
	_, err = reader.Seek(start, io.SeekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seek"})
		return
	}

	c.Status(http.StatusPartialContent)
	c.Header("Accept-Ranges", "bytes")
	c.Header("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileLength))
	c.Header("Content-Length", fmt.Sprintf("%d", length))

	_, err = io.CopyN(c.Writer, reader, length)
	if err != nil && err != io.EOF {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stream file"})
	}
}

func getFileProgress(c *gin.Context) {
	infoHash := c.Param("infohash")
	fileIdxStr := c.Param("file_idx")
	fileIdx, err := strconv.Atoi(fileIdxStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file index"})
		return
	}

	torrentFile, exists := getTorrentByInfoHash(infoHash)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent not found"})
		return
	}

	// Wait for metadata to be available
	if torrentFile.Info() == nil {
		c.JSON(http.StatusOK, gin.H{"ready": false, "completed": 0, "length": 0, "percent": 0})
		return
	}

	files := torrentFile.Files()
	if fileIdx < 0 || fileIdx >= len(files) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File index out of range"})
		return
	}

	file := files[fileIdx]
	c.JSON(http.StatusOK, gin.H{
		"ready":     true,
		"completed": file.BytesCompleted(),
		"length":    file.Length(),
		"percent":   float64(file.BytesCompleted()) / float64(file.Length()) * 100,
	})
}
