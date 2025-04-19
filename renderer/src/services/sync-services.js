import RxPlayer from 'rx-player';

export class SyncService {
  constructor() {
    this.player = new RxPlayer();
    this.syncThreshold = 2000; // ms
    this.isMaster = false;
  }

  initializePlayer(videoElement) {
    this.player.setVideoElement(videoElement);
    
    this.player.addEventListener('timeupdate', () => {
      if (this.isMaster) {
        this.broadcastState();
      }
    });
  }

  broadcastState() {
    const state = {
      currentTime: this.player.getPosition(),
      paused: this.player.isPaused(),
      timestamp: Date.now()
    };
    
    window.api.send('sync-event', {
      type: 'playback',
      payload: state
    });
  }

  applyRemoteState(remoteState) {
    const latency = Date.now() - remoteState.timestamp;
    const targetTime = remoteState.currentTime + (latency / 1000);
    
    if (Math.abs(this.player.getPosition() - targetTime) > 2) {
      this.player.seekTo(targetTime);
    }
    
    if (remoteState.paused !== this.player.isPaused()) {
      remoteState.paused ? this.player.pause() : this.player.play();
    }
  }
}