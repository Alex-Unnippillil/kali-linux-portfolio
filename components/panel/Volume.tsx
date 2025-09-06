import React, { useEffect, useState } from 'react';
import useDoNotDisturb from '../../hooks/useDoNotDisturb';
import {
  subscribeState,
  play,
  pause,
  next,
  prev,
} from '../../utils/nowPlaying';

export default function Volume() {
  const [volume, setVolume] = useState(0.5);
  const [dnd] = useDoNotDisturb();

  const [track, setTrack] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const unsub = subscribeState((s) => {
      setTrack(s.track);
      setPlaying(s.playing);
    });
    return unsub;
  }, []);

  const togglePlay = () => {
    if (playing) pause();
    else play();
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
      {track && (
        <div className='text-center text-white text-sm'>{track}</div>
      )}
      <div className='flex justify-center gap-2'>
        <button aria-label='Previous track' onClick={() => prev()}>⏮</button>
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={dnd}
        >
          {playing ? '⏸' : '▶️'}
        </button>
        <button aria-label='Next track' onClick={() => next()}>⏭</button>
      </div>
    </div>
  );
}
