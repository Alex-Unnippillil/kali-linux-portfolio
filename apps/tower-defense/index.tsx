import React, { useEffect, useRef, useState } from 'react';
import upgrades from './upgrades.json';
import { createEmptyMap, MapData, Enemy } from './engine';
import LevelEditor from './levelEditor';

const SIZE = 10;

const TowerDefense: React.FC = () => {
  const [map, setMap] = useState<MapData>(() => createEmptyMap(SIZE));
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./waveWorker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = workerRef.current;
    worker.onmessage = (e) => {
      if (e.data.type === 'state') setEnemies(e.data.enemies);
    };
    worker.postMessage({ type: 'init', map });
    const id = setInterval(() => worker.postMessage({ type: 'tick' }), 500);
    return () => {
      clearInterval(id);
      worker.terminate();
    };
  }, [map]);

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
        {Array.from({ length: map.height }).map((_, y) =>
          Array.from({ length: map.width }).map((_, x) => {
            const enemy = enemies.find((e) => e.x === x && e.y === y);
            let bg = 'bg-green-700';
            if (enemy) bg = 'bg-red-600';
            else if (map.walls.has(`${x},${y}`)) bg = 'bg-gray-800';
            else if (map.start.x === x && map.start.y === y) bg = 'bg-blue-500';
            else if (map.goal.x === x && map.goal.y === y) bg = 'bg-yellow-500';
            return <div key={`${x}-${y}`} className={`w-6 h-6 border border-gray-900 ${bg}`} />;
          })
        )}
      </div>
      <LevelEditor map={map} onChange={setMap} />
      <pre className="text-xs">{JSON.stringify(upgrades, null, 2)}</pre>
    </div>
  );
};

export default TowerDefense;
