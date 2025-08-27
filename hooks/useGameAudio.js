import { useEffect, useRef } from 'react';

// Initializes a Web Audio context if available and cleans up on unmount.
export default function useGameAudio() {
  const ctxRef = useRef(null);

  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctxRef.current = AudioCtx ? new AudioCtx() : null;
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  return ctxRef.current;
}
