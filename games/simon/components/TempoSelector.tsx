'use client';

import type { ChangeEvent } from 'react';

const MIN_TEMPO = 60;
const MAX_TEMPO = 140;

function isValidTempo(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_TEMPO && value <= MAX_TEMPO;
}

export default function TempoSelector({
  tempo,
  onTempoChange,
  min = MIN_TEMPO,
  max = MAX_TEMPO,
}: {
  tempo: number;
  onTempoChange: (tempo: number) => void;
  min?: number;
  max?: number;
}) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isValidTempo(value)) return;
    onTempoChange(value);
  };

  return (
    <label className="flex items-center space-x-2">
      <input type="range" min={min} max={max} value={tempo} onChange={handleChange} />
      <span>{tempo} BPM</span>
    </label>
  );
}

export { isValidTempo };
