import React, { useState } from 'react';

const tileSize = 16;

const palette = [
  { type: 1, color: '#888', label: 'Block' },
  { type: 5, color: 'gold', label: 'Coin' },
  { type: 6, color: 'blue', label: 'Checkpoint' },
  { type: 'spawn', color: '#0f0', label: 'Spawn' },
  { type: 0, color: '#000', label: 'Erase' },
];

const LevelEditor = ({ onSave, onCancel }) => {
  const width = 20;
  const height = 10;
  const [tiles, setTiles] = useState(
    Array.from({ length: height }, () => Array(width).fill(0))
  );
  const [spawn, setSpawn] = useState({ x: 0, y: 0 });
  const [name, setName] = useState('');

  const handleDrop = (x, y, e) => {
    e.preventDefault();
    const t = e.dataTransfer.getData('tile');
    if (!t) return;
    if (t === 'spawn') {
      setSpawn({ x, y });
      return;
    }
    const val = parseInt(t, 10) || 0;
    setTiles((prev) => {
      const copy = prev.map((r) => r.slice());
      copy[y][x] = val;
      return copy;
    });
  };

  const handleDragOver = (e) => e.preventDefault();

  const save = () => {
    const data = {
      width,
      height,
      tiles,
      spawn: { x: spawn.x * tileSize, y: spawn.y * tileSize },
    };
    onSave(name || `Custom ${Date.now()}`, data);
  };

  const getColor = (x, y, val) => {
    if (spawn.x === x && spawn.y === y) return '#0f0';
    if (val === 1) return '#888';
    if (val === 5) return 'gold';
    if (val === 6) return 'blue';
    return 'transparent';
  };

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full overflow-auto flex flex-col">
      <div className="mb-2">Drag tiles onto the grid to build a level.</div>
      <div className="flex space-x-2 mb-2">
        {palette.map((p) => (
          <div
            key={p.label}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('tile', p.type)}
            className="w-8 h-8 border border-gray-500 flex items-center justify-center cursor-move"
            style={{ background: p.color }}
            title={p.label}
          />
        ))}
      </div>
      <div
        className="mb-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width},20px)`,
          gridTemplateRows: `repeat(${height},20px)`,
        }}
      >
        {tiles.map((row, y) =>
          row.map((val, x) => (
            <div
              key={`${x}-${y}`}
              onDrop={(e) => handleDrop(x, y, e)}
              onDragOver={handleDragOver}
              className="border border-gray-600 w-5 h-5"
              style={{ background: getColor(x, y, val) }}
            />
          ))
        )}
      </div>
      <input
        className="text-black p-1 mb-2"
        placeholder="Level name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={save}
        >
          Save
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LevelEditor;

