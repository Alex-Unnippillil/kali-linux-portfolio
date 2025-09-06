import React, { useState } from 'react';
import useDoNotDisturb from '../../hooks/useDoNotDisturb';

export default function Volume() {
  const [volume, setVolume] = useState(0.5);
  const [dnd] = useDoNotDisturb();

  const playSample = () => {
    if (dnd || typeof window === 'undefined') return;
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  return (
    <div className='p-2 space-y-2 w-40'>
      <input
        type='range'
        min='0'
        max='1'
        step='0.01'
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        aria-label='Volume'
        className='ubuntu-slider w-full'
      />
      <button
        onClick={playSample}
        disabled={dnd}
        className='px-2 py-1 bg-ubt-grey text-white rounded w-full'
      >
        Play sample track
      </button>
    </div>
  );
}
