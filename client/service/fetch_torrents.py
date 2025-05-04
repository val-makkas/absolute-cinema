from flask import Flask, request, Response, jsonify
import libtorrent as lt
import time
import threading
import os

app = Flask(__name__)

# Directory to store torrent data
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# In-memory map of sessions
sessions = {}

class TorrentSession:
    def __init__(self, info_hash):
        self.info_hash = info_hash
        self.session = lt.session()
        self.session.listen_on(6881, 6891)
        self.params = {
            'save_path': DOWNLOAD_DIR,
            'storage_mode': lt.storage_mode_t.storage_mode_sparse
        }
        self.handle = self.session.add_torrent({**self.params, 'info_hash': info_hash})
        self.handle.set_sequential_download(True)

    def status(self):
        s = self.handle.status()
        return {
            'state': str(s.state),
            'progress': s.progress * 100,
            'download_rate': s.download_rate,
            'upload_rate': s.upload_rate,
            'num_peers': s.num_peers
        }

@app.route('/add', methods=['POST'])
def add_torrent():
    data = request.json
    info_hash = data.get('info_hash')
    if not info_hash:
        return jsonify({'error': 'info_hash is required'}), 400
    if info_hash not in sessions:
        sessions[info_hash] = TorrentSession(info_hash)
    return jsonify({'info_hash': info_hash}), 200

@app.route('/status/<info_hash>')
def status(info_hash):
    if info_hash not in sessions:
        return jsonify({'error': 'session not found'}), 404
    return jsonify(sessions[info_hash].status())

@app.route('/stream/<info_hash>/<int:file_idx>')
def stream(info_hash, file_idx):
    if info_hash not in sessions:
        return jsonify({'error': 'session not found'}), 404
    ts = sessions[info_hash]
    torrent = ts.handle.get_torrent_info()
    file = ts.handle.torrent_file().files()[file_idx]
    file_entry = ts.handle.get_torrent_info().files()[file_idx]
    file_path = os.path.join(DOWNLOAD_DIR, file_entry.path)
    def generate():
        with open(file_path, 'rb') as f:
            chunk = f.read(1024*1024)
            while chunk:
                yield chunk
                chunk = f.read(1024*1024)
    return Response(generate(), mimetype='video/mp4')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, threaded=True)