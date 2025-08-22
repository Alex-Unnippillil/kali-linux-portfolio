import React from 'react';
import { MapData } from './engine';

interface Props {
  map: MapData;
  onChange: (m: MapData) => void;
}

const LevelEditor: React.FC<Props> = ({ map, onChange }) => {
  const toggle = (x: number, y: number) => {
    const k = `${x},${y}`;
    const walls = new Set(map.walls);
    if (walls.has(k)) walls.delete(k);
    else walls.add(k);
    onChange({ ...map, walls });
  };

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
      <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
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
                onClick={() => toggle(x, y)}
              />
            );
          })
        )}
      </div>
      <button type="button" onClick={save} className="px-2 py-1 bg-gray-700">
        Save
      </button>
    </div>
  );
};

export default LevelEditor;
