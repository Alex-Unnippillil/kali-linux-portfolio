import { useEffect, useRef } from 'react';

// Minimal audio helper using the Web Audio API
export default function useGameAudio(src, { volume = 1 } = {}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
    };
  }, [src, volume]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  return { play };
}
