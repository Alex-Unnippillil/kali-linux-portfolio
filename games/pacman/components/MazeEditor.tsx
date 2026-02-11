import React, { useEffect, useMemo, useState } from 'react';
import type { LevelDefinition, Tile } from '../../../apps/pacman/types';

const STORAGE_PREFIX = 'pacman:level:v2:';

const defaultLevel: LevelDefinition = {
  name: 'Custom',
  maze: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
    [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
    [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  fruit: { x: 7, y: 3 },
  fruitTimes: [12, 28],
  fruitRuleMode: 'time',
  pacStart: { x: 1, y: 1 },
  ghostStart: { x: 7, y: 3 },
};

const tileOptions: { value: Tile; label: string }[] = [
  { value: 0, label: 'Empty' },
  { value: 1, label: 'Wall' },
  { value: 2, label: 'Pellet' },
  { value: 3, label: 'Energizer' },
];

interface MazeEditorProps {
  onPlay?: (level: LevelDefinition) => void;
}

const safeStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  },
};

const cloneLevel = (level: LevelDefinition): LevelDefinition => ({
  ...level,
  maze: level.maze.map((row) => row.slice()) as Tile[][],
  fruit: level.fruit ? { ...level.fruit } : undefined,
  pacStart: level.pacStart ? { ...level.pacStart } : undefined,
  ghostStart: level.ghostStart ? { ...level.ghostStart } : undefined,
  fruitTimes: level.fruitTimes?.slice(),
  fruitPelletThresholds: level.fruitPelletThresholds?.slice(),
});

const validateLevel = (level: LevelDefinition): string | null => {
  if (!level.maze.length || !level.maze[0]?.length) return 'Maze must have at least one row and one column.';
  const width = level.maze[0].length;
  if (!level.maze.every((row) => row.length === width)) return 'Maze must be rectangular.';
  const pellets = level.maze.flat().filter((tile) => tile === 2 || tile === 3).length;
  if (pellets === 0) return 'Add at least one pellet or energizer.';
  if (!level.maze.flat().some((tile) => tile !== 1)) return 'Maze needs walkable tiles for spawns.';
  return null;
};

const MazeEditor: React.FC<MazeEditorProps> = ({ onPlay }) => {
  const [level, setLevel] = useState<LevelDefinition>(() => cloneLevel(defaultLevel));
  const [paint, setPaint] = useState<Tile>(1);
  const [saved, setSaved] = useState<string[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [importName, setImportName] = useState('Imported');
  const [symmetry, setSymmetry] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const refreshSaved = () => {
    const names: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) names.push(key.replace(STORAGE_PREFIX, ''));
    }
    names.sort();
    setSaved(names);
  };

  useEffect(() => {
    refreshSaved();
  }, []);

  const paintedLevel = useMemo(() => cloneLevel(level), [level]);

  const applyTile = (x: number, y: number) => {
    setLevel((current) => {
      const next = cloneLevel(current);
      next.maze[y][x] = paint;
      if (symmetry) {
        const mirroredX = next.maze[0].length - 1 - x;
        next.maze[y][mirroredX] = paint;
      }
      return next;
    });
  };

  const resize = (rows: number, cols: number) => {
    setLevel((current) => {
      const targetRows = Math.max(3, current.maze.length + rows);
      const targetCols = Math.max(3, current.maze[0].length + cols);
      const nextMaze = Array.from({ length: targetRows }, (_, y) =>
        Array.from({ length: targetCols }, (_, x) => current.maze[y]?.[x] ?? (y === 0 || y === targetRows - 1 || x === 0 || x === targetCols - 1 ? 1 : 2)),
      ) as Tile[][];
      return { ...cloneLevel(current), maze: nextMaze };
    });
  };

  const saveLevel = () => {
    const name = window.prompt('Level name?')?.trim() || level.name || 'custom';
    safeStorage.set(`${STORAGE_PREFIX}${name}`, JSON.stringify(level));
    refreshSaved();
  };

  const loadLevel = (name: string) => {
    const raw = safeStorage.get(`${STORAGE_PREFIX}${name}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LevelDefinition;
      setLevel(cloneLevel(parsed));
      setErrorMessage('');
    } catch {
      setErrorMessage('Saved level is invalid JSON.');
    }
  };

  const exportLevel = () => setJsonText(JSON.stringify(level, null, 2));

  const importLevel = () => {
    try {
      const parsed = JSON.parse(jsonText) as LevelDefinition;
      const validation = validateLevel(parsed);
      if (validation) {
        setErrorMessage(validation);
        return;
      }
      setLevel(cloneLevel(parsed));
      const name = importName.trim() || `Imported-${Date.now()}`;
      safeStorage.set(`${STORAGE_PREFIX}${name}`, JSON.stringify(parsed));
      refreshSaved();
      setErrorMessage('');
    } catch {
      setErrorMessage('Import JSON is malformed.');
    }
  };

  const handlePlay = () => {
    const validation = validateLevel(level);
    if (validation) {
      setErrorMessage(validation);
      return;
    }
    onPlay?.(paintedLevel);
  };

  return (
    <div className="space-y-3 rounded bg-slate-950/70 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
        <label className="flex flex-col gap-1">Level name
          <input className="rounded bg-slate-800 px-2 py-1" value={level.name ?? ''} onChange={(event) => setLevel((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="flex items-end gap-2">
          <input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} />
          Symmetry paint
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {tileOptions.map((tile) => (
          <button key={tile.value} type="button" onClick={() => setPaint(tile.value)} className={`rounded px-2 py-1 text-xs ${paint === tile.value ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-100'}`}>
            {tile.label}
          </button>
        ))}
      </div>
      <div className="inline-grid border border-slate-700" style={{ gridTemplateColumns: `repeat(${level.maze[0].length}, 20px)` }}>
        {level.maze.map((row, y) => row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            type="button"
            data-testid={`cell-${x}-${y}`}
            data-tile={cell}
            onClick={() => applyTile(x, y)}
            className={`h-5 w-5 border border-slate-800 ${cell === 1 ? 'bg-blue-700' : 'bg-slate-950'} flex items-center justify-center`}
          >
            {cell === 2 && <span className="h-1 w-1 rounded-full bg-slate-100" />}
            {cell === 3 && <span className="h-2 w-2 rounded-full bg-amber-200" />}
          </button>
        )))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={() => resize(1, 0)}>+ Row</button>
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={() => resize(-1, 0)}>- Row</button>
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={() => resize(0, 1)}>+ Col</button>
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={() => resize(0, -1)}>- Col</button>
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={() => setLevel(cloneLevel(defaultLevel))}>Reset</button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={saveLevel}>Save Level</button>
        <button type="button" className="rounded bg-slate-700 px-2 py-1" onClick={exportLevel}>Export JSON</button>
        <select aria-label="Load maze" className="rounded bg-slate-800 px-2 py-1" defaultValue="" onChange={(event) => loadLevel(event.target.value)}>
          <option value="">Load...</option>
          {saved.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        {onPlay && <button type="button" className="rounded bg-emerald-500 px-2 py-1 text-slate-900" onClick={handlePlay}>Play This Maze</button>}
      </div>
      <label className="block text-xs text-slate-200">Import name
        <input aria-label="Import name" className="mt-1 w-full rounded bg-slate-800 px-2 py-1" value={importName} onChange={(event) => setImportName(event.target.value)} />
      </label>
      <textarea aria-label="Maze JSON" className="h-28 w-full rounded bg-slate-900 px-2 py-1 font-mono text-xs" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
      <button type="button" className="rounded bg-slate-700 px-2 py-1 text-xs" onClick={importLevel}>Import JSON</button>
      {errorMessage && <p className="text-xs text-rose-300">{errorMessage}</p>}
    </div>
  );
};

export default MazeEditor;
