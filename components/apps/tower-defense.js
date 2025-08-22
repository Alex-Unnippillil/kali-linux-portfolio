import React, { useState, useEffect, useRef } from 'react';

// Grid configuration
const GRID_SIZE = 10;
const START = { x: 0, y: 4 };
const GOAL = { x: GRID_SIZE - 1, y: 4 };

// Tower configuration for each level
const TOWER_STATS = [
  { damage: 1, range: 2, fireRate: 1 },
  { damage: 2, range: 3, fireRate: 0.8 },
  { damage: 3, range: 3, fireRate: 0.6, dot: { damage: 1, duration: 3 } },
];

const MAX_PROJECTILES = 100;

// A* pathfinding taking towers as obstacles
const computePath = (towers) => {
  const obstacles = new Set(towers.map((t) => `${t.x},${t.y}`));
  const key = (p) => `${p.x},${p.y}`;
  const open = [
    {
      x: START.x,
      y: START.y,
      g: 0,
      f: Math.abs(START.x - GOAL.x) + Math.abs(START.y - GOAL.y),
      parent: null,
    },
  ];
  const closed = new Set();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (current.x === GOAL.x && current.y === GOAL.y) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(key(current));
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    dirs.forEach((d) => {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const nKey = `${nx},${ny}`;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacles.has(nKey) ||
        closed.has(nKey)
      )
        return;
      const g = current.g + 1;
      const h = Math.abs(nx - GOAL.x) + Math.abs(ny - GOAL.y);
      const existing = open.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + h;
          existing.parent = current;
        }
      } else {
        open.push({ x: nx, y: ny, g, f: g + h, parent: current });
      }
    });
  }
  return null;
};

const TowerDefense = () => {
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState(
    Array.from({ length: MAX_PROJECTILES }, () => ({ active: false }))
  );
  const [path, setPath] = useState(() => computePath([]));
  const [wave, setWave] = useState(1);
  const [speed, setSpeed] = useState(1);
  const enemyId = useRef(0);

  const towersRef = useRef(towers);
  const enemiesRef = useRef(enemies);
  const projectilesRef = useRef(projectiles);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);

  const spawnWave = (waveNum) => {
    const count = 5 + waveNum;
    const newEnemies = [];
    for (let i = 0; i < count; i += 1) {
      const isBoss = i === 0 && waveNum % 5 === 0;
      newEnemies.push({
        id: enemyId.current++,
        x: START.x,
        y: START.y,
        pathIndex: 0,
        health: isBoss ? 20 + waveNum * 5 : 5 + waveNum,
        resistance: isBoss ? 0.5 : waveNum % 3 === 0 ? 0.25 : 0,
        boss: isBoss,
        dot: null,
      });
    }
    setEnemies((prev) => [...prev, ...newEnemies]);
  };

  useEffect(() => {
    spawnWave(1);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWave((w) => {
        const next = w + 1;
        spawnWave(next);
        return next;
      });
    }, 15000 / speed);
    return () => clearInterval(interval);
  }, [speed]);

  // recompute path when towers change
  useEffect(() => {
    const newPath = computePath(towers);
    if (newPath) setPath(newPath);
  }, [towers]);

  // adjust enemies to new path
  useEffect(() => {
    setEnemies((prev) =>
      prev.map((e) => {
        const idx = path.findIndex((p) => p.x === e.x && p.y === e.y);
        return idx === -1 ? { ...e, pathIndex: 0, x: START.x, y: START.y } : { ...e, pathIndex: idx };
      })
    );
  }, [path]);

  const handleCellClick = (x, y) => {
    if (path.some((p) => p.x === x && p.y === y)) return;
    const existing = towers.find((t) => t.x === x && t.y === y);
    if (existing) {
      setTowers(
        towers.map((t) =>
          t.x === x && t.y === y
            ? { ...t, level: Math.min(t.level + 1, 3) }
            : t
        )
      );
      return;
    }
    const newTower = { x, y, level: 1, cooldown: 0 };
    const newTowers = [...towers, newTower];
    const newPath = computePath(newTowers);
    if (newPath) {
      setTowers(newTowers);
      setPath(newPath);
    }
  };

  const tick = () => {
    // Move enemies and apply DOT
    enemiesRef.current = enemiesRef.current
      .map((e) => {
        const next = path[e.pathIndex + 1];
        if (next) {
          e.x = next.x;
          e.y = next.y;
          e.pathIndex += 1;
        }
        if (e.dot) {
          e.dot.remaining -= 0.1 * speed;
          if (e.dot.remaining <= 0) {
            e.dot = null;
          } else {
            e.health -= Math.max(0, e.dot.damage - e.resistance) * 0.1 * speed;
          }
        }
        return e;
      })
      .filter((e) => e.health > 0 && e.pathIndex < path.length - 1);

    // Towers attack
    towersRef.current = towersRef.current.map((tower) => {
      const stats = TOWER_STATS[tower.level - 1];
      tower.cooldown -= 0.1 * speed;
      if (tower.cooldown <= 0) {
        const target = enemiesRef.current.find(
          (e) => Math.abs(e.x - tower.x) + Math.abs(e.y - tower.y) <= stats.range
        );
        if (target) {
          const idx = projectilesRef.current.findIndex((p) => !p.active);
          if (idx !== -1) {
            projectilesRef.current[idx] = {
              active: true,
              x: tower.x,
              y: tower.y,
              targetId: target.id,
              damage: stats.damage,
              speed: 1,
              dot: stats.dot,
            };
          }
          tower.cooldown = stats.fireRate;
        }
      }
      return tower;
    });

    // Update projectiles and apply damage
    projectilesRef.current = projectilesRef.current.map((p) => {
      if (!p.active) return p;
      const target = enemiesRef.current.find((e) => e.id === p.targetId);
      if (!target) return { ...p, active: false };
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      if (Math.abs(dx) + Math.abs(dy) <= p.speed * speed) {
        target.health -= Math.max(0, p.damage - target.resistance);
        if (p.dot) {
          target.dot = { damage: p.dot.damage, remaining: p.dot.duration };
        }
        return { ...p, active: false };
      }
      return {
        ...p,
        x: p.x + Math.sign(dx) * p.speed * speed,
        y: p.y + Math.sign(dy) * p.speed * speed,
      };
    });

    enemiesRef.current = enemiesRef.current.filter((e) => e.health > 0);

    // Sync state
    setEnemies([...enemiesRef.current]);
    setTowers([...towersRef.current]);
    setProjectiles([...projectilesRef.current]);
  };

  useEffect(() => {
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, path]);

  const renderCell = (x, y) => {
    const isPath = path.some((p) => p.x === x && p.y === y);
    const tower = towers.find((t) => t.x === x && t.y === y);
    const enemy = enemies.find((e) => e.x === x && e.y === y);
    const projectile = projectiles.find(
      (p) => p.active && Math.round(p.x) === x && Math.round(p.y) === y
    );

    let bg = 'bg-green-700';
    if (isPath) bg = 'bg-gray-600';
    if (tower) bg = 'bg-blue-700';
    if (enemy) bg = 'bg-red-700';
    if (projectile) bg = 'bg-yellow-400';

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
      <div className="mb-2 flex items-center space-x-2">
        <span>Wave: {wave}</span>
        <button
          type="button"
          onClick={() => setSpeed(0.5)}
          className={`px-2 ${speed === 0.5 ? 'bg-blue-500' : 'bg-gray-700'}`}
        >
          0.5x
        </button>
        <button
          type="button"
          onClick={() => setSpeed(1)}
          className={`px-2 ${speed === 1 ? 'bg-blue-500' : 'bg-gray-700'}`}
        >
          1x
        </button>
        <button
          type="button"
          onClick={() => setSpeed(2)}
          className={`px-2 ${speed === 2 ? 'bg-blue-500' : 'bg-gray-700'}`}
        >
          2x
        </button>
      </div>
      <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
        {Array.from({ length: GRID_SIZE }).map((_, y) =>
          Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
        )}
      </div>
      <div className="mt-2 text-sm text-center">
        Click to place towers or upgrade existing ones. Towers attack enemies
        within range. Boss enemies appear every 5 waves. Speed controls at the
        top adjust game speed.
      </div>
    </div>
  );
};

export default TowerDefense;

