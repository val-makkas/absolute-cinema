import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WebTorrent from 'webtorrent';

export default function VideoPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');

  // Source must include infoHash and fileIdx
  const source = location.state?.source;
  if (!source) {
    useEffect(() => { navigate('/'); }, [navigate]);
    return null;
  }

  useEffect(() => {
    const { infoHash, fileIdx } = source;
    if (!infoHash) {
      setError('No infoHash provided');
      setLoading(false);
      return;
    }
    if (fileIdx == null) {
      setError('No file index provided');
      setLoading(false);
      return;
    }

    const client = new WebTorrent();
    const magnetURI = `magnet:?xt=urn:btih:${infoHash}`;

    client.add(magnetURI, (torrent) => {
      // Sequential download for streaming
      torrent.files.forEach((f) => f.select());

      // Strictly use source.fileIdx
      const idx = parseInt(fileIdx, 10);
      if (idx < 0 || idx >= torrent.files.length) {
        setError('File index out of range');
        setLoading(false);
        return;
      }
      const file = torrent.files[idx];

      setTitle(file.name);

      // Render into the video element
      file.renderTo(
        videoRef.current,
        { autoplay: true, controls: true },
        () => setLoading(false)
      );

      torrent.on('error', (err) => {
        setError(err.message);
        setLoading(false);
      });
    });

    return () => {
      client.destroy();
    };
  }, [source, navigate]);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (loading) return <div className="p-4">Loading {title || 'video'}...</div>;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h2 className="mb-4 text-lg font-semibold">Now Playing: {title}</h2>
      <video
        ref={videoRef}
        className="w-full max-w-3xl rounded-lg shadow-lg"
      />
    </div>
  );
}