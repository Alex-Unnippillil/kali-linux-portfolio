'use client';

import { useEffect } from 'react';
import { ENEMY_TYPES } from '../../../apps/games/tower-defense';
import share from '../../../utils/share';

export type WaveConfig = {
  type: keyof typeof ENEMY_TYPES;
  count: number;
};

interface Props {
  waves: WaveConfig[];
  setWaves: (waves: WaveConfig[]) => void;
}

const defaultWave: WaveConfig = { type: 'fast', count: 1 };

const WaveEditor = ({ waves, setWaves }: Props) => {
  const addWave = () => setWaves([...waves, { ...defaultWave }]);

  const updateWave = (
    index: number,
    field: keyof WaveConfig,
    value: string | number
  ) => {
    const updated = waves.map((w, i) =>
      i === index ? { ...w, [field]: value } : w
    );
    setWaves(updated);
  };

  const removeWave = (index: number) => {
    setWaves(waves.filter((_, i) => i !== index));
  };

  const shareConfig = async () => {
    const encoded = btoa(JSON.stringify(waves));
    const url = `${window.location.origin}${window.location.pathname}?waves=${encodeURIComponent(
      encoded
    )}`;
    const text = 'Check out my tower defense wave configuration!';
    const ok = await share(text, 'Tower Defense Waves', url);
    if (!ok) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* noop */
      }
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const data = params.get('waves');
      if (data) {
        const parsed = JSON.parse(atob(data));
        if (Array.isArray(parsed)) setWaves(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [setWaves]);

  return (
    <div className="space-y-2">
      {waves.map((w, i) => (
        <div key={i} className="flex items-center space-x-2">
          <select
            className="px-1 py-0.5 text-black rounded"
            value={w.type}
            onChange={(e) => updateWave(i, 'type', e.target.value)}
          >
            {Object.keys(ENEMY_TYPES).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            className="w-16 px-1 py-0.5 text-black rounded border"
            value={w.count}
            onChange={(e) =>
              updateWave(i, 'count', parseInt(e.target.value, 10) || 1)
            }
          />
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => removeWave(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={addWave}
        >
          Add Wave
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={shareConfig}
        >
          Share
        </button>
      </div>
    </div>
  );
};

export default WaveEditor;
