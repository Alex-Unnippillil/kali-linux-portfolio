'use client';

import { useEffect, useRef, useState } from 'react';

const DB_NAME = '2048';
const STORE_NAME = 'replays';
const tileColors: Record<number, string> = {
  2: 'bg-gray-300 text-gray-800',
  4: 'bg-gray-400 text-gray-800',
  8: 'bg-yellow-400 text-white',
  16: 'bg-yellow-500 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-orange-600 text-white',
  128: 'bg-red-500 text-white',
  256: 'bg-red-600 text-white',
  512: 'bg-red-700 text-white',
  1024: 'bg-green-500 text-white',
  2048: 'bg-green-600 text-white',
};

type Replay = {
  id: number;
  date: string;
  moves: string[];
  boardType: 'classic' | 'hex';
  hard: boolean;
  frames?: number[][][];
};

const loadReplays = (): Promise<Replay[]> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve([]);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        resolve(getAll.result as Replay[]);
      };
      getAll.onerror = () => resolve([]);
    };
    req.onerror = () => resolve([]);
  });

const Replays = ({ onClose }: { onClose: () => void }) => {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [current, setCurrent] = useState<Replay | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadReplays().then(setReplays);
  }, []);

  useEffect(() => {
    if (!playing || !current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const delay = 500 / speed;
    intervalRef.current = setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (!current.frames || next >= current.frames.length) {
          setPlaying(false);
          return f;
        }
        return next;
      });
    }, delay);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, current]);

  const startReplay = (rep: Replay) => {
    setCurrent(rep);
    setFrame(0);
    setPlaying(false);
  };

  const step = () => {
    if (!current?.frames) return;
    setFrame((f) => Math.min(f + 1, current.frames!.length - 1));
  };

  const displayCell = (v: number) => {
    if (v === 0) return '';
    if (current?.boardType === 'hex') return v.toString(16).toUpperCase();
    return v;
  };

  const board = current?.frames?.[frame];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 text-white p-4 overflow-auto z-50">
      <div className="mb-4 flex space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={current ? () => setCurrent(null) : onClose}
        >
          {current ? 'Back' : 'Close'}
        </button>
        {current && (
          <>
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={step}>
              Step
            </button>
            <div className="flex items-center space-x-1">
              <label htmlFor="replay-speed">Speed</label>
              <input
                id="replay-speed"
                aria-label="Speed"
                type="range"
                min={0.5}
                max={2}
                step={0.5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>
          </>
        )}
      </div>
      {!current && (
        <ul className="space-y-2">
          {replays.map((r) => (
            <li key={r.id}>
              <button
                className="w-full text-left px-2 py-1 bg-gray-700 rounded"
                onClick={() => startReplay(r)}
              >
                {new Date(r.date).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      )}
      {current && !board && (
        <div className="mt-4">No replay data</div>
      )}
      {current && board && (
        <div className="mt-4 flex flex-col items-center">
          <div className="grid w-full max-w-sm grid-cols-4 gap-2">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div key={`${rIdx}-${cIdx}`} className="w-full aspect-square">
                  <div
                    className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded ${
                      cell ? tileColors[cell] || 'bg-gray-700' : 'bg-gray-800'
                    }`}
                  >
                    {displayCell(cell)}
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Replays;

