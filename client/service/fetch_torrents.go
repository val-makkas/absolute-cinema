package main

import (
	"io"
	"net/http"
	"os"
	"strconv"

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
	r.GET("/steam/:infohash/:file_idx", streamTorrentFile)

	r.Run(":5000")
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

	torrents[infoHash] = torrentFile
	c.JSON(http.StatusOK, gin.H{"info_hash": infoHash})
}

func getTorrentStatus(c *gin.Context) {
	infoHash := c.Param("info_hash")

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
	infoHash := c.Param("info_hash")
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
	filePath := file.Path()

	// Open the file
	f, err := os.Open(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	// Set proper content type for video files
	c.Header("Content-Type", "video/mp4")

	// Stream the file content
	_, err = io.Copy(c.Writer, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stream file"})
	}
}
