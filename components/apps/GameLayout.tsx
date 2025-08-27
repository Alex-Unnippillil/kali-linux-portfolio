import React, { useState, useEffect, useCallback, useRef } from 'react';
import HelpOverlay from './HelpOverlay';

interface GameLayoutProps {
  gameId: string;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameId, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const close = useCallback(() => setShowHelp(false), []);
  const toggle = useCallback(() => setShowHelp((h) => !h), []);

  // Show tutorial overlay on first visit
  useEffect(() => {
    try {
      const key = `seen_tutorial_${gameId}`;
      if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
        setShowHelp(true);
        window.localStorage.setItem(key, '1');
      }
    } catch {
      // ignore storage errors
    }
  }, [gameId]);

  // Allow closing overlay with Escape
  useEffect(() => {
    if (!showHelp) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHelp]);

  // Auto-pause when page becomes hidden
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const resume = useCallback(() => setPaused(false), []);

  // Record canvas stream and keep last ~20 seconds
  useEffect(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
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
      recorderRef.current = recorder;
      return () => {
        recorder.stop();
      };
    } catch {
      // ignore recorder errors
    }
  }, []);

  const share = useCallback(async () => {
    const canvas = canvasRef.current;
    let blob: Blob | null = null;
    if (chunksRef.current.length) {
      blob = new Blob(chunksRef.current, { type: 'video/webm' });
    } else if (canvas) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
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
    <div className="relative h-full w-full">
      {showHelp && <HelpOverlay gameId={gameId} onClose={close} />}
      {paused && (
        <div
          className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={resume}
            className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring"
            autoFocus
          >
            Resume
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Share"
        onClick={share}
        className="absolute top-2 right-12 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ⤴️
      </button>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={showHelp}
        onClick={toggle}
        className="absolute top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {children}
    </div>
  );
};

export default GameLayout;
