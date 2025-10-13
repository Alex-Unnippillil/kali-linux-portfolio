"use client";

import React, { useEffect, useRef, useState } from 'react';

const CameraApp: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<string>('');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    let stream: MediaStream;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        // ignore errors
      }
    };
    start();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleLoaded = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const { x, y } = getPos(e);
    const ctx = overlayRef.current!.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const { x, y } = getPos(e);
    const ctx = overlayRef.current!.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  const clearOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/png'));
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto flex flex-col items-center space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="rounded"
          onLoadedMetadata={handleLoaded}
          autoPlay
          playsInline
        />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 rounded cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
      <div className="space-x-2">
        <button
          type="button"
          onClick={takeSnapshot}
          className="px-4 py-2 bg-blue-700 rounded"
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={clearOverlay}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Clear Overlay
        </button>
      </div>
      {snapshot && (
        <img
          src={snapshot}
          alt="Snapshot"
          className="max-w-full border border-gray-700 rounded"
        />
      )}
    </div>
  );
};

export default CameraApp;

