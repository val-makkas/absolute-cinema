export class WebSocketClient {
    constructor() {
      this.ws = null;
    }
  
    connect() {
      this.ws = new WebSocket('ws://localhost:8080');
      
      this.ws.onopen = () => {
        console.log('Connected to WebSocket server');
      };
  
      this.ws.onmessage = (event) => {
        console.log('Received message:', event.data);
      };
    }
}