import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  createEnemyPool,
  spawnEnemy,
  deactivateEnemy,
  loadSprite,
  getTowerCost,
} from './tower-defense-core';

const MAX_PROJECTILES = 100;
const MAX_ENEMIES = 200;
const ENEMY_REWARD = 5;

const TowerDefense = () => {
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState(() => createEnemyPool(MAX_ENEMIES));
  const [projectiles, setProjectiles] = useState(
    createProjectilePool(MAX_PROJECTILES)
  );
  const [path, setPath] = useState(() => getPath([]));
  const [wave, setWave] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [lives, setLives] = useState(20);
  const [resources, setResources] = useState(100);
  const [towerType, setTowerType] = useState('single');
  const [waves, setWaves] = useState([{ count: 5, baseSpeed: 0.5, health: 5 }]);
  const [waveInput, setWaveInput] = useState(
    JSON.stringify(waves, null, 2)
  );
  const enemySprite = useMemo(
    () => loadSprite('/themes/Yaru/status/ubuntu_white_hex.svg'),
    []
  );
  const towerSprite = useMemo(
    () => loadSprite('/themes/Yaru/status/chrome_refresh.svg'),
    []
  );
  const enemyId = useRef(0);
  const victory = useRef(false);

  const towersRef = useRef(towers);
  const enemiesRef = useRef(enemies);
  const projectilesRef = useRef(projectiles);
  const wavesRef = useRef(waves);
  const pathCanvasRef = useRef(null);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);
  useEffect(() => {
    wavesRef.current = waves;
  }, [waves]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(waveInput);
      if (Array.isArray(parsed)) setWaves(parsed);
    } catch (err) {
      // ignore parse errors
    }
  }, [waveInput]);

  useEffect(() => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    const cell = 32;
    canvas.width = GRID_SIZE * cell;
    canvas.height = GRID_SIZE * cell;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    path.forEach((p, i) => {
      const x = p.x * cell + cell / 2;
      const y = p.y * cell + cell / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [path]);

  const spawnWave = (waveNum) => {
    ReactGA.event({ category: 'tower-defense', action: 'wave_start', value: waveNum });
    const config = wavesRef.current[waveNum - 1] || {
      count: 5 + waveNum,
      baseSpeed: 0.5 + waveNum * 0.05,
      health: 5 + waveNum,
    };
    for (let i = 0; i < config.count; i += 1) {
      spawnEnemy(enemiesRef.current, {
        id: enemyId.current++,
        x: START.x,
        y: START.y,
        pathIndex: 0,
        progress: 0,
        health: config.health,
        resistance: 0,
        baseSpeed: config.baseSpeed,
        slow: null,
        dot: null,
      });
    }
    setEnemies([...enemiesRef.current]);
  };

  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem('td-state') : null;
    if (saved) {
      try {
        const {
          towers: stTowers,
          wave: stWave,
          lives: stLives,
          resources: stResources,
        } = JSON.parse(saved);
        setTowers(stTowers);
        setWave(stWave);
        setLives(stLives);
        setResources(stResources ?? 100);
        setPath(getPath(stTowers));
        spawnWave(stWave);
        return;
      } catch (err) {
        // ignore parse errors and start a new game
      }
    }
    spawnWave(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'td-state',
        JSON.stringify({ towers, wave, lives, resources })
      );
    }
  }, [towers, wave, lives, resources]);

  useEffect(() => {
    if (speed === 0) return undefined;
    const interval = setInterval(() => {
      setWave((w) => {
        const next = w + 1;
        spawnWave(next);
        if (next === 10)
          ReactGA.event({ category: 'tower-defense', action: 'victory' });
        return next;
      });
    }, 15000 / speed);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    setPath(getPath(towers));
  }, [towers]);

  useEffect(() => {
    enemiesRef.current.forEach((e) => {
      if (!e.active) return;
      const idx = path.findIndex((p) => p.x === e.x && p.y === e.y);
      if (idx === -1) {
        e.pathIndex = 0;
        e.x = START.x;
        e.y = START.y;
        e.progress = 0;
      } else {
        e.pathIndex = idx;
      }
    });
    setEnemies([...enemiesRef.current]);
  }, [path]);

  const handleCellClick = (x, y) => {
    if (path.some((p) => p.x === x && p.y === y)) return;
    const existing = towers.find((t) => t.x === x && t.y === y);
    if (existing) {
      const maxLevel = TOWER_TYPES[existing.type].length;
      const cost = getTowerCost(existing.type, existing.level + 1);
      if (existing.level < maxLevel && resources >= cost) {
        setResources((r) => r - cost);
        setTowers(
          towers.map((t) =>
            t.x === x && t.y === y ? { ...t, level: t.level + 1 } : t
          )
        );
        ReactGA.event({ category: 'tower-defense', action: 'upgrade' });
      }
      return;
    }
    const cost = getTowerCost(towerType, 1);
    if (resources < cost) return;
    const newTower = { x, y, level: 1, type: towerType, cooldown: 0 };
    const newTowers = [...towers, newTower];
    const newPath = getPath(newTowers);
    if (newPath) {
      setResources((r) => r - cost);
      setTowers(newTowers);
      setPath(newPath);
      ReactGA.event({ category: 'tower-defense', action: 'tower_place', label: towerType });
    }
  };

  const handleCellRightClick = (x, y, e) => {
    e.preventDefault();
    const existing = towers.find((t) => t.x === x && t.y === y);
    if (existing) {
      const refund = Math.floor(getTowerCost(existing.type, existing.level) / 2);
      setResources((r) => r + refund);
      setTowers(towers.filter((t) => !(t.x === x && t.y === y)));
    }
  };

  const tick = () => {
    // Move enemies and apply effects
    enemiesRef.current.forEach((e) => {
      if (!e.active) return;
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
      if (e.health <= 0) {
        deactivateEnemy(e);
        setResources((r) => r + ENEMY_REWARD);
        return;
      }
      if (e.pathIndex >= path.length - 1) {
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0 && !victory.current) {
            ReactGA.event({ category: 'tower-defense', action: 'defeat' });
          }
          return nl;
        });
        deactivateEnemy(e);
      }
    });

    // Build quadtree
    const qt = new Quadtree(0, 0, GRID_SIZE, GRID_SIZE);
    enemiesRef.current.forEach((e) => {
      if (e.active) qt.insert({ x: e.x, y: e.y, r: 0.5, ref: e });
    });

    // Towers attack
    towersRef.current = towersRef.current.map((tower) => {
      const stats = TOWER_TYPES[tower.type][tower.level - 1];
      tower.cooldown -= 0.1 * speed;
      if (tower.cooldown <= 0) {
        const candidates = qt
          .retrieve({ x: tower.x, y: tower.y, r: stats.range })
          .filter(
            (c) =>
              Math.abs(c.x - tower.x) + Math.abs(c.y - tower.y) <= stats.range
          );
        if (stats.aoe) {
          if (candidates.length) {
            candidates.forEach((c) => {
              c.ref.health -= Math.max(0, stats.damage - c.ref.resistance);
            });
            tower.cooldown = stats.fireRate;
          }
        } else {
          const targetObj = candidates[0];
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
      }
      return tower;
    });

    // Update projectiles
    projectilesRef.current.forEach((p) => {
      if (!p.active) return;
      const target = enemiesRef.current.find(
        (e) => e.active && e.id === p.targetId
      );
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
    const enemy = enemies.find((e) => e.active && e.x === x && e.y === y);
    const projectile = projectiles.find(
      (p) => p.active && Math.round(p.x) === x && Math.round(p.y) === y
    );

    let bg = 'bg-green-700';
    if (isPath) bg = 'bg-gray-600';
    if (tower) bg = 'bg-blue-700';
    if (enemy) bg = 'bg-red-700';
    if (projectile) bg = 'bg-yellow-400';

    let content = null;
    if (tower) {
      content = (
        <>
          <img src={towerSprite.src} alt="tower" className="w-full h-full" />
          <span className="absolute inset-0 flex items-center justify-center text-xs">
            {tower.level}
          </span>
        </>
      );
    } else if (enemy) {
      content = <img src={enemySprite.src} alt="enemy" className="w-full h-full" />;
    }

    return (
      <div
        key={`${x}-${y}`}
        className={`relative w-8 h-8 border border-gray-900 ${bg}`}
        onClick={() => handleCellClick(x, y)}
        onContextMenu={(e) => handleCellRightClick(x, y, e)}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <textarea
        className="mb-2 w-full text-black p-1"
        value={waveInput}
        onChange={(e) => setWaveInput(e.target.value)}
        rows={4}
      />
      <div className="mb-2 flex items-center space-x-2">
        <span>Wave: {wave}</span>
        <span>Lives: {lives}</span>
        <span>Resources: {resources}</span>
        <button
          type="button"
          onClick={() => setSpeed(0)}
          className={`px-2 ${speed === 0 ? 'bg-blue-500' : 'bg-gray-700'}`}
        >
          Pause
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
        <button
          type="button"
          onClick={() => setSpeed(4)}
          className={`px-2 ${speed === 4 ? 'bg-blue-500' : 'bg-gray-700'}`}
        >
          4x
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
      <div
        className="relative"
        style={{ width: GRID_SIZE * 32, height: GRID_SIZE * 32 }}
      >
        <canvas
          ref={pathCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        <div className="grid grid-cols-10" style={{ lineHeight: 0 }}>
          {Array.from({ length: GRID_SIZE }).map((_, y) =>
            Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
          )}
        </div>
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
