import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [canStream, setCanStream] = useState(false);
  const [progress, setProgress] = useState(null);

  const source = location.state?.source;
  //  const infoHash = source?.infoHash;
  // const fileIdx = source?.fileIdx ?? 0;

  const infoHash = '08ada5a7a6183aae1e09d831df6748d566095a10';
  const fileIdx = 0;

  // Add the torrent on mount
  useEffect(() => {
    if (infoHash) {
      fetch('http://localhost:5050/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ infoHash })
      });
    }
  }, [infoHash]);

  // Poll for file availability and progress
  useEffect(() => {
    if (!infoHash) return;
    let stopped = false;
    let interval;
    async function poll() {
      try {
        const res = await fetch(`http://localhost:5050/progress/${infoHash}/${fileIdx}`);
        if (res.ok) {
          const prog = await res.json();
          setProgress(prog);
          // Wait for at least 2MB buffered or 1% downloaded
          if (prog.completed > 30 * 1024 * 1024 || prog.percent > 3) {
            setCanStream(true);
            return;
          }
        }
      } catch (e) { }
      if (!stopped) {
        interval = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => {
      stopped = true;
      if (interval) clearTimeout(interval);
    };
  }, [infoHash, fileIdx]);

  const streamUrl = canStream ? `http://localhost:5050/stream/${infoHash}/${fileIdx}` : null;

  const handleCanPlay = () => setLoading(false);
  const handleWaiting = () => setLoading(true);

  if (!infoHash) return <div>No source selected.</div>;
  if (!canStream) {
    return (
      <div style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        background: "#18181b",
        borderRadius: 18,
        boxShadow: "0 8px 32px #000c, 0 0 16px #0006",
        padding: 48,
        color: "#ffe082",
        textAlign: "center"
      }}>
        <LoadingSpinner size={48} color="#ffe082" />
        <div style={{ marginTop: 24 }}>
          Preparing stream, please wait...<br />
          {progress && (
            <span>
              Downloaded: {((progress.completed / 1024 / 1024) || 0).toFixed(2)} MB / {((progress.length / 1024 / 1024) || 0).toFixed(2)} MB
              ({(progress.percent || 0).toFixed(2)}%)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: 900,
      margin: "0 auto",
      background: "#18181b",
      borderRadius: 18,
      boxShadow: "0 8px 32px #000c, 0 0 16px #0006",
      overflow: "hidden",
    }}>
      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(24,24,27,0.85)",
        }}>
          <LoadingSpinner size={48} color="#ffe082" />
        </div>
      )}
      <video
        ref={videoRef}
        src={streamUrl}
        controls
        autoPlay
        style={{
          width: "100%",
          height: "auto",
          background: "#000",
          borderRadius: 18,
          zIndex: 1,
        }}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        poster={source?.poster}
        title={source?.title || "Streaming Video"}
      />
    </div>
  );
}