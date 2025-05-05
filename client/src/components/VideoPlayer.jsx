import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { LoadingSpinner } from "@/components/icons/LoadingSpinner";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [canStream, setCanStream] = useState(false);


  const source = location.state?.source;
  const infohash = source?.infoHash;
  const fileidx = source?.fileIdx ?? 0;

  useEffect(() => {
    if (infohash) {
      fetch('http://localhost:5050/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ infoHash: infohash })
      })
    }
  }, [infohash])

  useEffect(() => {
    if (!infohash) return;
    let interval;
    let stopped = false;

    async function pollStatus() {
      try {
        const res = await fetch(`http://localhost:5050/status/${infohash}`);
        if (res.ok) {
          const status = await res.json();
          // If there are files, allow streaming
          if (status && status.PiecesComplete > 0) {
            setCanStream(true);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      if (!stopped) {
        interval = setTimeout(pollStatus, 1000);
      }
    }
    pollStatus();
    return () => {
      stopped = true;
      if (interval) clearTimeout(interval);
    };
  }, [infohash]);


  // Build the stream URL
  const streamUrl = `http://localhost:5050/stream/${infohash}/${fileidx}`;

  const handleCanPlay = () => setLoading(false);
  const handleWaiting = () => setLoading(true);

  if (!infohash) return <div>No source selected.</div>;

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
        title={source.title || "Video Player"}
      />
    </div>
  );
}