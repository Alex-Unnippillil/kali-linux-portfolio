import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 10;
const PATH = Array.from({ length: GRID_SIZE }, (_, i) => ({ x: i, y: 4 }));

const TowerDefense = () => {
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [wave, setWave] = useState(1);
  const enemyId = useRef(0);

  useEffect(() => {
    const spawnWave = (waveNum) => {
      for (let i = 0; i < waveNum + 2; i += 1) {
        setEnemies((prev) => [
          ...prev,
          { id: enemyId.current++, pathIndex: 0, health: 3 },
        ]);
      }
    };
    spawnWave(1);
    const interval = setInterval(() => {
      setWave((w) => {
        const next = w + 1;
        spawnWave(next);
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setEnemies((prev) =>
        prev
          .map((enemy) => ({ ...enemy, pathIndex: enemy.pathIndex + 1 }))
          .map((enemy) => {
            const pos = PATH[Math.min(enemy.pathIndex, PATH.length - 1)];
            let health = enemy.health;
            towers.forEach((t) => {
              const dist = Math.abs(t.x - pos.x) + Math.abs(t.y - pos.y);
              if (dist <= 2) health -= 1;
            });
            return { ...enemy, health };
          })
          .filter(
            (enemy) =>
              enemy.health > 0 && enemy.pathIndex < PATH.length
          )
      );
    }, 500);
    return () => clearInterval(interval);
  }, [towers]);

  const handleCellClick = (x, y) => {
    if (PATH.some((p) => p.x === x && p.y === y)) return;
    if (towers.some((t) => t.x === x && t.y === y)) return;
    setTowers([...towers, { x, y }]);
  };

  const renderCell = (x, y) => {
    const isPath = PATH.some((p) => p.x === x && p.y === y);
    const tower = towers.find((t) => t.x === x && t.y === y);
    const enemy = enemies.find((e) => {
      const pos = PATH[e.pathIndex];
      return pos && pos.x === x && pos.y === y;
    });

    let bg = 'bg-green-700';
    if (isPath) bg = 'bg-gray-600';
    if (tower) bg = 'bg-blue-700';
    if (enemy) bg = 'bg-red-700';

    return (
      <div
        key={`${x}-${y}`}
        className={`w-8 h-8 border border-gray-900 ${bg}`}
        onClick={() => handleCellClick(x, y)}
      />
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2">Wave: {wave}</div>
      <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
        {Array.from({ length: GRID_SIZE }).map((_, y) =>
          Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
        )}
      </div>
      <div className="mt-2 text-sm">Click to place towers. Towers attack enemies within range.</div>
    </div>
  );
};

export default TowerDefense;

