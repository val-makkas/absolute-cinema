package main

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/anacrolix/torrent"
	"github.com/gin-gonic/gin"
)

var client *torrent.Client
var torrents = make(map[string]*torrent.Torrent)

func init() {
	var err error
	client, err = torrent.NewClient(nil)
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

	go func() {
		<-torrentFile.GotInfo()
		canonical := torrentFile.InfoHash().HexString()
		torrents[canonical] = torrentFile
		fmt.Println("Added torrent (canonical):", canonical)
	}()

	c.JSON(http.StatusOK, gin.H{"info_hash": infoHash})
}

func getTorrentStatus(c *gin.Context) {
	infoHash := c.Param("infohash")

	torrentFile, exists := torrents[infoHash]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent not found"})
		return
	}

	status := torrentFile.Stats()
	c.JSON(http.StatusOK, gin.H{
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

	torrentFile, exists := torrents[infoHash]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Torrent not found"})
		return
	}

	if fileIdx < 0 || fileIdx >= len(torrentFile.Files()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File index out of range"})
		return
	}

	file := torrentFile.Files()[fileIdx]
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
	reader := file.NewReader()
	defer reader.Close()
	_, err = reader.Seek(start, io.SeekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seek"})
		return
	}

	c.Status(http.StatusPartialContent)
	c.Header("Content-Type", "video/mp4")
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

	torrentFile, exists := torrents[infoHash]
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
	c.JSON(http.StatusOK, gin.H{
		"completed": file.BytesCompleted(),
		"length":    file.Length(),
		"percent":   float64(file.BytesCompleted()) / float64(file.Length()) * 100,
	})
}
