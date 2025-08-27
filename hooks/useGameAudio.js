import { useRef } from 'react';

export default function useGameAudio() {
  const ctxRef = useRef(null);

  const ensureContext = () => {
    if (ctxRef.current) return ctxRef.current;
    try {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctxRef.current = null;
    }
    return ctxRef.current;
  };

  const playClick = () => {
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 440;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  };

  return { playClick };
}
