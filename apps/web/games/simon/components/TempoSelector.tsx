'use client';

import type { ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const MIN_TEMPO = 60;
const MAX_TEMPO = 140;

export default function TempoSelector({
  onChange,
}: {
  onChange?: (tempo: number) => void;
}) {
  const [tempo, setTempo] = usePersistentState<number>('simon:tempo', 100);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setTempo(value);
    onChange?.(value);
  };

  return (
    <label className="flex items-center space-x-2">
      <input
        type="range"
        min={MIN_TEMPO}
        max={MAX_TEMPO}
        value={tempo}
        onChange={handleChange}
      />
      <span>{tempo} BPM</span>
    </label>
  );
}
