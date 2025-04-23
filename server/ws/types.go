package ws

type Message struct {
	Type      string `json:"type"`
	Username  string `json:"username"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
	RoomID    string `json:"roomId,omitempty"`
}
