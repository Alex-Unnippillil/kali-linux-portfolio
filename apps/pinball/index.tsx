'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTiltSensor } from './tilt';

const themes: Record<string, { bg: string; flipper: string }> = {
  classic: { bg: '#0b3d91', flipper: '#ffd700' },
  space: { bg: '#000000', flipper: '#00ffff' },
  forest: { bg: '#064e3b', flipper: '#9acd32' },
};

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [theme, setTheme] = useState<keyof typeof themes>('classic');
  const [power, setPower] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [tilt, setTilt] = useState(false);
  const [score, setScore] = useState(0);
  const nudgesRef = useRef<number[]>([]);

  const handleTilt = useCallback(() => {
    setTilt(true);
    workerRef.current?.postMessage({ type: 'tilt', value: true });
    setTimeout(() => {
      setTilt(false);
      workerRef.current?.postMessage({ type: 'tilt', value: false });
      nudgesRef.current = [];
    }, 3000);
  }, []);

  useTiltSensor(25, handleTilt);

  useEffect(() => {
    if (!canvasRef.current) return;
    const worker = new Worker(new URL('./worker.ts', import.meta.url));
    workerRef.current = worker;
    const offscreen = canvasRef.current.transferControlToOffscreen();
    worker.postMessage(
      { type: 'init', canvas: offscreen, theme, power, bounce },
      [offscreen],
    );
    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.type === 'score') {
        setScore(e.data.score);
      }
    };
    return () => {
      worker.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'settings', theme, power, bounce });
  }, [theme, power, bounce]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tilt) return;
      if (e.code === 'KeyN') {
        const now = Date.now();
        nudgesRef.current = nudgesRef.current.filter((t) => now - t < 5000);
        nudgesRef.current.push(now);
        workerRef.current?.postMessage({ type: 'nudge' });
        if (nudgesRef.current.length >= 3) {
          handleTilt();
        }
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        workerRef.current?.postMessage({ type: 'keydown', code: e.code });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        workerRef.current?.postMessage({ type: 'keyup', code: e.code });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTilt, tilt]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-4">
        <label className="flex flex-col text-xs">
          Power
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={power}
            onChange={(e) => setPower(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Bounce
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={bounce}
            onChange={(e) => setBounce(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-xs">
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as keyof typeof themes)}
          >
            {Object.keys(themes).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={400} height={600} className="border" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-mono text-xl">
          {score.toString().padStart(6, '0')}
        </div>
        {!tilt && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs opacity-75">
            Press N to nudge
          </div>
        )}
        {tilt && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-700/80">
            <div className="text-white font-bold text-4xl px-6 py-3 border-4 border-white rounded">
              TILT
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

