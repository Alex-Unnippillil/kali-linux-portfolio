'use client';

import { useEffect, useRef, useState } from 'react';
import GameLayout from '../../components/apps/GameLayout';
import DpsCharts from '../games/tower-defense/components/DpsCharts';
import {
  ENEMY_TYPES,
  Tower,
  upgradeTower,
  Enemy,
  createEnemyPool,
  spawnEnemy,
} from '../games/tower-defense';

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [maps, setMaps] = useState<Record<string, { x: number; y: number }[]>>({});
  const enemiesRef = useRef<EnemyInstance[]>([]);
  const enemyPool = useRef(createEnemyPool(50));
  const lastTime = useRef(0);
  const running = useRef(false);
  const spawnTimer = useRef(0);

  const togglePath = (x: number, y: number) => {
    const key = `${x},${y}`;
    setPath((p) => {
      const set = pathSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return p.filter((c) => !(c.x === x && c.y === y));
      }
      set.add(key);
      return [...p, { x, y }];
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('tdMaps');
    if (stored) {
      try {
        setMaps(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const loadMap = (name: string) => {
    const m = maps[name];
    if (!m) return;
    setPath(m);
    pathSetRef.current = new Set(m.map((c) => `${c.x},${c.y}`));
    setTowers([]);
    setSelected(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const key = `${x},${y}`;
    if (editing) {
      togglePath(x, y);
      return;
    }
    const existing = towers.findIndex((t) => t.x === x && t.y === y);
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    if (pathSetRef.current.has(key)) return;
    setTowers((ts) => [...ts, { x, y, range: 1, damage: 1, level: 1 }]);
  };

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = '#555';
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
    ctx.fillStyle = '#666';
    path.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    ctx.fillStyle = 'blue';
    towers.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      if (selected === i) {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(
          t.x * CELL_SIZE + CELL_SIZE / 2,
          t.y * CELL_SIZE + CELL_SIZE / 2,
          t.range * CELL_SIZE,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    });
    ctx.fillStyle = 'red';
    enemiesRef.current.forEach((en) => {
      ctx.beginPath();
      ctx.arc(
        en.x * CELL_SIZE + CELL_SIZE / 2,
        en.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  };

  const spawnEnemyInstance = () => {
    if (!path.length) return;
    const types = Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[];
    const type = types[Math.floor(Math.random() * types.length)];
    const spec = ENEMY_TYPES[type];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
      x: path[0].x,
      y: path[0].y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type,
    });
    if (enemy) enemiesRef.current.push(enemy as EnemyInstance);
  };

  const update = (time: number) => {
    const dt = (time - lastTime.current) / 1000;
    lastTime.current = time;
    if (running.current) {
      spawnTimer.current += dt;
      if (spawnTimer.current > 1) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
      }
      enemiesRef.current.forEach((en) => {
        const next = path[en.pathIndex + 1];
        if (!next) return;
        const dx = next.x - en.x;
        const dy = next.y - en.y;
        const dist = Math.hypot(dx, dy);
        const step = (en.baseSpeed * dt) / CELL_SIZE;
        if (step >= dist) {
          en.x = next.x;
          en.y = next.y;
          en.pathIndex += 1;
        } else {
          en.x += (dx / dist) * step;
          en.y += (dy / dist) * step;
        }
      });
      enemiesRef.current = enemiesRef.current.filter((e) => {
        const reached = e.pathIndex >= path.length - 1;
        return e.health > 0 && !reached;
      });
      towers.forEach((t) => {
        (t as any).cool = (t as any).cool ? (t as any).cool - dt : 0;
        if ((t as any).cool <= 0) {
          const enemy = enemiesRef.current.find(
            (e) =>
              Math.hypot(e.x - t.x, e.y - t.y) <= t.range
          );
          if (enemy) {
            enemy.health -= t.damage;
            (t as any).cool = 1;
          }
        }
      });
    }
    draw();
    requestAnimationFrame(update);
  };

  useEffect(() => {
    lastTime.current = performance.now();
    requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!path.length) return;
    running.current = true;
    setEditing(false);
  };

  const upgrade = (type: 'range' | 'damage') => {
    if (selected === null) return;
    setTowers((ts) => {
      const t = { ...ts[selected] };
      upgradeTower(t, type);
      const arr = [...ts];
      arr[selected] = t;
      return arr;
    });
  };

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-2 space-y-2">
        <div className="space-x-2 mb-2">
          <select
            className="px-2 py-1 bg-gray-700 rounded"
            onChange={(e) => loadMap(e.target.value)}
            defaultValue=""
          >
            <option value="">Load Map</option>
            {Object.keys(maps).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? 'Finish Editing' : 'Edit Map'}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={start}
            disabled={running.current}
          >
            Start
          </button>
          {selected !== null && (
            <>
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={() => upgrade('range')}
              >
                Upgrade Range
              </button>
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={() => upgrade('damage')}
              >
                Upgrade Damage
              </button>
            </>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="bg-black"
          onClick={handleCanvasClick}
        />
        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
