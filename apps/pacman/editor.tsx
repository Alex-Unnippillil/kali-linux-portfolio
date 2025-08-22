import React, { useState } from 'react';

const SIZE = 10;

const Editor: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>(
    () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0)),
  );
  const toggle = (x: number, y: number) => {
    setGrid((g) => {
      const copy = g.map((r) => r.slice());
      copy[y][x] = (copy[y][x] + 1) % 3; // 0 empty, 1 wall, 2 power
      return copy;
    });
  };
  const exportLevel = () => {
    const walls: string[] = [];
    const pellets: string[] = [];
    const powerUps: string[] = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const val = grid[y][x];
        const key = `${x},${y}`;
        if (val === 1) walls.push(key);
        else pellets.push(key);
        if (val === 2) powerUps.push(key);
      }
    }
    const data = {
      width: SIZE,
      height: SIZE,
      walls,
      pellets,
      powerUps,
      player: { x: 1, y: 1 },
      ghosts: [],
      fruit: [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'custom-level.json';
    a.click();
  };
  return (
    <div className="mt-4">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 20px)` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x},${y}`}
              onClick={() => toggle(x, y)}
              className={`w-5 h-5 border ${
                cell === 1 ? 'bg-gray-800' : cell === 2 ? 'bg-orange-400' : ''
              }`}
            />
          )),
        )}
      </div>
      <button
        type="button"
        onClick={exportLevel}
        className="mt-2 px-2 py-1 bg-gray-300 rounded"
      >
        Export
      </button>
    </div>
  );
};

export default Editor;
