'use client';

import { useEffect, useRef, useState } from 'react';
import GameLayout from '../../components/apps/GameLayout';

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Cell = { x: number; y: number };

const TowerDefenseEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [path, setPath] = useState<Cell[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [maps, setMaps] = useState<Record<string, Cell[]>>({});

  useEffect(() => {
    const stored = localStorage.getItem('tdMaps');
    if (stored) {
      try {
        setMaps(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = '#555';
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
    ctx.fillStyle = '#666';
    path.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const togglePath = (x: number, y: number) => {
    const key = `${x},${y}`;
    setPath((p) => {
      const set = pathSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return p.filter((c) => !(c.x === x && c.y === y));
      }
      set.add(key);
      return [...p, { x, y }];
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    togglePath(x, y);
  };

  const saveMap = () => {
    const mapName = name.trim();
    if (!mapName) return;
    const updated = { ...maps, [mapName]: path };
    localStorage.setItem('tdMaps', JSON.stringify(updated));
    setMaps(updated);
  };

  const loadMap = (mapName: string) => {
    setName(mapName);
    const m = maps[mapName] || [];
    setPath(m);
    pathSetRef.current = new Set(m.map((c) => `${c.x},${c.y}`));
  };

  const clearMap = () => {
    setPath([]);
    pathSetRef.current.clear();
  };

  return (
    <GameLayout gameId="tower-defense-editor">
      <div className="p-2 space-y-2">
        <div className="space-x-2 mb-2">
          <select
            className="px-2 py-1 bg-gray-700 rounded"
            onChange={(e) => loadMap(e.target.value)}
            value={name}
          >
            <option value="">New Map</option>
            {Object.keys(maps).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input
            className="px-2 py-1 bg-gray-700 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Map name"
          />
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={saveMap}
          >
            Save
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={clearMap}
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="bg-black"
          onClick={handleCanvasClick}
        />
      </div>
    </GameLayout>
  );
};

export default TowerDefenseEditor;

