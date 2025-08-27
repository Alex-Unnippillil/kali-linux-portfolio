import React, { useEffect, useRef, useCallback } from 'react';

const GameLayout = ({ children, stage, lives, score, highScore }) => {
  const canvasRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas || !canvas.captureStream) return;
    canvasRef.current = canvas;
    try {
      const stream = canvas.captureStream();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) {
          chunksRef.current.push(e.data);
          if (chunksRef.current.length > 20) chunksRef.current.shift();
        }
      };
      recorder.start(1000);
      return () => recorder.stop();
    } catch {
      // ignore recorder errors
    }
  }, []);

  const share = useCallback(async () => {
    const canvas = canvasRef.current;
    let blob = null;
    if (chunksRef.current.length) {
      blob = new Blob(chunksRef.current, { type: 'video/webm' });
    } else if (canvas) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }
    if (!blob) return;
    const fileName = blob.type.startsWith('video') ? 'clip.webm' : 'screenshot.png';
    const url = URL.createObjectURL(blob);
    const file = new File([blob], fileName, { type: blob.type });
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Gameplay' });
      } else {
        try {
          await navigator.clipboard?.writeText(url);
        } catch {
          // clipboard may fail
        }
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <div className="h-full w-full relative text-white">
      <button
        type="button"
        aria-label="Share"
        onClick={share}
        className="absolute top-2 right-2 z-10 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ⤴️
      </button>
      <div className="absolute top-2 left-2 z-10 text-sm space-y-1">
        <div>Stage: {stage}</div>
        <div>Lives: {lives}</div>
        {score !== undefined && <div>Score: {score}</div>}
        {highScore !== undefined && <div>High: {highScore}</div>}
      </div>
      {children}

    </div>
  );
};

export default GameLayout;
