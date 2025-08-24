import React, { useState, useMemo } from 'react';
import { MapData, astarPaths } from './engine';

interface Props {
  map: MapData;
  onChange: (m: MapData) => void;
}

type Tool = 'wall' | 'erase' | 'start' | 'goal';

const LevelEditor: React.FC<Props> = ({ map, onChange }) => {
  const [tool, setTool] = useState<Tool>('wall');

  const paint = (x: number, y: number) => {
    const k = `${x},${y}`;
    const walls = new Set(map.walls);
    switch (tool) {
      case 'wall': {
        if (map.start.x === x && map.start.y === y) return;
        if (map.goal.x === x && map.goal.y === y) return;
        walls.add(k);
        onChange({ ...map, walls });
        break;
      }
      case 'erase': {
        walls.delete(k);
        onChange({ ...map, walls });
        break;
      }
      case 'start': {
        if (map.goal.x === x && map.goal.y === y) return;
        walls.delete(k);
        onChange({ ...map, start: { x, y }, walls });
        break;
      }
      case 'goal': {
        if (map.start.x === x && map.start.y === y) return;
        walls.delete(k);
        onChange({ ...map, goal: { x, y }, walls });
        break;
      }
      default:
        break;
    }
  };

  const valid = useMemo(() => astarPaths(map).length > 0, [map]);

  const save = async () => {
    await fetch('/api/tower-defense/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width: map.width,
        height: map.height,
        start: map.start,
        goal: map.goal,
        walls: Array.from(map.walls),
      }),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['wall', 'erase', 'start', 'goal'] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={`px-2 py-1 ${tool === t ? 'bg-gray-600' : 'bg-gray-700'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button type="button" onClick={save} className="px-2 py-1 bg-gray-700 ml-auto">
          Save
        </button>
      </div>
      {!valid && <div className="text-red-500 text-sm">No valid path!</div>}
      <div
        className="grid"
        style={{ lineHeight: 0, gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: map.height }).map((_, y) =>
          Array.from({ length: map.width }).map((_, x) => {
            let bg = 'bg-green-700';
            if (map.walls.has(`${x},${y}`)) bg = 'bg-gray-800';
            if (map.start.x === x && map.start.y === y) bg = 'bg-blue-500';
            if (map.goal.x === x && map.goal.y === y) bg = 'bg-yellow-500';
            return (
              <div
                key={`${x}-${y}`}
                className={`w-6 h-6 border border-gray-900 ${bg}`}
                onMouseDown={() => paint(x, y)}
                onMouseEnter={(e) => e.buttons === 1 && paint(x, y)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default LevelEditor;
