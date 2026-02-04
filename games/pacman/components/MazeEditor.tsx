import React, { useEffect, useState } from 'react';

// 0: empty, 1: wall, 2: pellet, 3: energizer
const defaultMaze: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
  [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
  [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

type Maze = number[][];

const tileOptions = [
  { value: 0, label: 'Empty' },
  { value: 1, label: 'Wall' },
  { value: 2, label: 'Pellet' },
  { value: 3, label: 'Energizer' },
];

interface MazeEditorProps {
  onPlay?: (maze: number[][]) => void;
}

const isValidMaze = (value: unknown): value is number[][] => {
  if (!Array.isArray(value) || value.length === 0) return false;
  const width = Array.isArray(value[0]) ? value[0].length : 0;
  if (!width) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === width &&
      row.every((cell) => [0, 1, 2, 3].includes(cell)),
  );
};

const MazeEditor: React.FC<MazeEditorProps> = ({ onPlay }) => {
  const [maze, setMaze] = useState<Maze>(() => defaultMaze.map((r) => r.slice()));
  const [paint, setPaint] = useState<number>(1);
  const [saved, setSaved] = useState<string[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [importName, setImportName] = useState('Imported');

  useEffect(() => {
    const names: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('pacmanMaze:')) {
        names.push(key.split(':')[1]);
      }
    }
    names.sort();
    setSaved(names);
  }, []);

  const handleClick = (x: number, y: number) => {
    setMaze((m) => {
      const copy = m.map((r) => r.slice());
      copy[y][x] = paint;
      return copy;
    });
  };

  const saveMaze = () => {
    const name = window.prompt('Maze name?');
    if (!name) return;
    window.localStorage.setItem(`pacmanMaze:${name}`, JSON.stringify(maze));
    setSaved((s) => (s.includes(name) ? s : [...s, name].sort()));
  };

  const loadMaze = (name: string) => {
    if (!name) return;
    const data = window.localStorage.getItem(`pacmanMaze:${name}`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) setMaze(parsed);
      } catch {
        // ignore
      }
    }
  };

  const resetMaze = () => setMaze(defaultMaze.map((r) => r.slice()));

  const exportMaze = () => {
    setJsonText(JSON.stringify(maze, null, 2));
  };

  const importMaze = () => {
    if (!jsonText) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (!isValidMaze(parsed)) return;
      setMaze(parsed);
      const name = importName?.trim() || `Imported-${Date.now()}`;
      window.localStorage.setItem(`pacmanMaze:${name}`, JSON.stringify(parsed));
      setSaved((s) => (s.includes(name) ? s : [...s, name].sort()));
    } catch {
      // ignore invalid JSON
    }
  };

  return (
    <div>
      <div className="mb-2 space-x-2">
        {tileOptions.map((t) => (
          <button
            key={t.value}
            onClick={() => setPaint(t.value)}
            className={`px-2 py-1 border ${paint === t.value ? 'bg-gray-300' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="inline-block"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${maze[0].length}, 20px)` }}
      >
        {maze.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              data-testid={`cell-${x}-${y}`}
              data-tile={cell}
              onClick={() => handleClick(x, y)}
              className={`w-5 h-5 border border-gray-800 flex items-center justify-center ${
                cell === 1 ? 'bg-blue-500' : 'bg-black'
              }`}
            >
              {cell === 2 && <div className="w-1 h-1 bg-white rounded-full" />}
              {cell === 3 && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          ))
        )}
      </div>
      <div className="mt-2 space-x-2">
        <button onClick={saveMaze} className="px-2 py-1 border">
          Save Maze
        </button>
        <button onClick={exportMaze} className="px-2 py-1 border">
          Export JSON
        </button>
        <select
          aria-label="Load maze"
          onChange={(e) => loadMaze(e.target.value)}
          className="border px-2 py-1"
          defaultValue=""
        >
          <option value="">Load...</option>
          {saved.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button onClick={resetMaze} className="px-2 py-1 border">
          Reset
        </button>
        {onPlay && (
          <button onClick={() => onPlay(maze)} className="px-2 py-1 border">
            Play This Maze
          </button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <label className="block text-sm">
          Import name
          <input
            type="text"
            aria-label="Import name"
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
            className="ml-2 border px-2 py-1 text-sm"
          />
        </label>
        <textarea
          aria-label="Maze JSON"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full h-32 border px-2 py-1 text-xs font-mono"
        />
        <button onClick={importMaze} className="px-2 py-1 border">
          Import JSON
        </button>
      </div>
    </div>
  );
};

export default MazeEditor;
