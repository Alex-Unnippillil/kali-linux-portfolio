import React, { useState, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import Quadtree from './quadtree';
import {
  GRID_SIZE,
  START,
  GOAL,
  TOWER_TYPES,
  getPath,
  createProjectilePool,
  fireProjectile,
} from './tower-defense-core';

const MAX_PROJECTILES = 100;

const TowerDefense = () => {
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState(
    createProjectilePool(MAX_PROJECTILES)
  );
  const [path, setPath] = useState(() => getPath([]));
  const [wave, setWave] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [lives, setLives] = useState(20);
  const [towerType, setTowerType] = useState('single');
  const enemyId = useRef(0);
  const victory = useRef(false);

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
    ReactGA.event({ category: 'tower-defense', action: 'wave_start', value: waveNum });
    const count = 5 + waveNum;
    const newEnemies = [];
    for (let i = 0; i < count; i += 1) {
      const baseSpeed = 0.5 + waveNum * 0.05;
      newEnemies.push({
        id: enemyId.current++,
        x: START.x,
        y: START.y,
        pathIndex: 0,
        progress: 0,
        health: 5 + waveNum,
        resistance: 0,
        baseSpeed,
        slow: null,
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
        if (next === 10) ReactGA.event({ category: 'tower-defense', action: 'victory' });
        return next;
      });
    }, 15000 / speed);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    setPath(getPath(towers));
  }, [towers]);

  useEffect(() => {
    setEnemies((prev) =>
      prev.map((e) => {
        const idx = path.findIndex((p) => p.x === e.x && p.y === e.y);
        return idx === -1
          ? { ...e, pathIndex: 0, x: START.x, y: START.y, progress: 0 }
          : { ...e, pathIndex: idx };
      })
    );
  }, [path]);

  const handleCellClick = (x, y) => {
    if (path.some((p) => p.x === x && p.y === y)) return;
    const existing = towers.find((t) => t.x === x && t.y === y);
    if (existing) {
      const maxLevel = TOWER_TYPES[existing.type].length;
      if (existing.level < maxLevel) {
        setTowers(
          towers.map((t) =>
            t.x === x && t.y === y ? { ...t, level: t.level + 1 } : t
          )
        );
        ReactGA.event({ category: 'tower-defense', action: 'upgrade' });
      }
      return;
    }
    const newTower = { x, y, level: 1, type: towerType, cooldown: 0 };
    const newTowers = [...towers, newTower];
    const newPath = getPath(newTowers);
    if (newPath) {
      setTowers(newTowers);
      setPath(newPath);
      ReactGA.event({ category: 'tower-defense', action: 'tower_place', label: towerType });
    }
  };

  const handleCellRightClick = (x, y, e) => {
    e.preventDefault();
    const existing = towers.find((t) => t.x === x && t.y === y);
    if (existing) {
      setTowers(towers.filter((t) => !(t.x === x && t.y === y)));
    }
  };

  const tick = () => {
    // Move enemies and apply effects
    enemiesRef.current = enemiesRef.current
      .map((e) => {
        const effSpeed = e.baseSpeed * (e.slow ? 1 - e.slow.amount : 1);
        e.progress += effSpeed * 0.1 * speed;
        while (e.progress >= 1) {
          const next = path[e.pathIndex + 1];
          if (!next) break;
          e.x = next.x;
          e.y = next.y;
          e.pathIndex += 1;
          e.progress -= 1;
        }
        if (e.dot) {
          e.dot.remaining -= 0.1 * speed;
          if (e.dot.remaining <= 0) e.dot = null;
          else e.health -= Math.max(0, e.dot.damage - e.resistance) * 0.1 * speed;
        }
        if (e.slow) {
          e.slow.remaining -= 0.1 * speed;
          if (e.slow.remaining <= 0) e.slow = null;
        }
        return e;
      })
      .filter((e) => {
        if (e.health <= 0) return false;
        if (e.pathIndex >= path.length - 1) {
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0 && !victory.current) {
              ReactGA.event({ category: 'tower-defense', action: 'defeat' });
            }
            return nl;
          });
          return false;
        }
        return true;
      });

    // Build quadtree
    const qt = new Quadtree(0, 0, GRID_SIZE, GRID_SIZE);
    enemiesRef.current.forEach((e) => qt.insert({ x: e.x, y: e.y, r: 0.5, ref: e }));

    // Towers attack
    towersRef.current = towersRef.current.map((tower) => {
      const stats = TOWER_TYPES[tower.type][tower.level - 1];
      tower.cooldown -= 0.1 * speed;
      if (tower.cooldown <= 0) {
        const candidates = qt.retrieve({ x: tower.x, y: tower.y, r: stats.range });
        const targetObj = candidates.find(
          (c) =>
            Math.abs(c.x - tower.x) + Math.abs(c.y - tower.y) <= stats.range
        );
        if (targetObj) {
          fireProjectile(projectilesRef.current, {
            x: tower.x,
            y: tower.y,
            targetId: targetObj.ref.id,
            damage: stats.damage,
            speed: 1,
            splash: stats.splash || 0,
            slow: stats.slow || null,
          });
          tower.cooldown = stats.fireRate;
        }
      }
      return tower;
    });

    // Update projectiles
    projectilesRef.current.forEach((p) => {
      if (!p.active) return;
      const target = enemiesRef.current.find((e) => e.id === p.targetId);
      if (!target) {
        p.active = false;
        return;
      }
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      if (Math.abs(dx) + Math.abs(dy) <= p.speed * speed) {
        target.health -= Math.max(0, p.damage - target.resistance);
        if (p.slow) {
          target.slow = { amount: p.slow.amount, remaining: p.slow.duration };
        }
        if (p.splash) {
          enemiesRef.current.forEach((e) => {
            if (
              e.id !== target.id &&
              Math.abs(e.x - target.x) + Math.abs(e.y - target.y) <= p.splash
            ) {
              e.health -= Math.max(0, p.damage - e.resistance);
            }
          });
        }
        p.active = false;
      } else {
        p.x += Math.sign(dx) * p.speed * speed;
        p.y += Math.sign(dy) * p.speed * speed;
      }
    });

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
        onContextMenu={(e) => handleCellRightClick(x, y, e)}
      />
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2 flex items-center space-x-2">
        <span>Wave: {wave}</span>
        <span>Lives: {lives}</span>
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
      <div className="mb-2 flex space-x-2">
        {Object.keys(TOWER_TYPES).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTowerType(type)}
            className={`px-2 ${towerType === type ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
        {Array.from({ length: GRID_SIZE }).map((_, y) =>
          Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
        )}
      </div>
      <div className="mt-2 text-sm text-center">
        Click to place towers or upgrade existing ones. Right-click to sell.
        Towers attack enemies within range. Speed controls at the top adjust
        game speed.
      </div>
    </div>
  );
};

export default TowerDefense;
