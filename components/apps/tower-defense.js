import React, { useRef, useEffect, useState, useCallback } from 'react';

const WIDTH = 400;
const HEIGHT = 400;
const BASE_SPAWN_COUNT = 5;
const ENEMIES_PER_WAVE = 2;
const SPAWN_INTERVAL = 0.5;
const INITIAL_LIVES = 10;
const BASE_ENEMY_SPEED = 40;
const ENEMY_SPEED_PER_WAVE = 5;
const BASE_ENEMY_HP = 10;
const ENEMY_HP_PER_WAVE = 2;
const TOWER_BASE_RANGE = 60;
const TOWER_RANGE_PER_LEVEL = 10;
const PROJECTILE_SPEED = 200;
const PROJECTILE_DAMAGE = 5;
const PROJECTILE_COOLDOWN = 0.5;
const PROJECTILE_TRAIL_LIMIT = 5;
const PROJECTILE_HIT_DISTANCE = 5;
const AOE_RADIUS = 30;
const DECAL_TTL = 0.3;
const DECAL_RADIUS = 6;
const DAMAGE_NUMBER_TTL = 1;
const DAMAGE_NUMBER_VY = -30;
const DAMAGE_NUMBER_ACCEL = 200;
const SHOCKWAVE_TTL = 0.3;
const SHOCKWAVE_GROWTH = 200;
const TOWER_PLACEMENT_RADIUS = 15;
const TOWER_MAX_LEVEL = 3;
const TOWER_RADIUS = 10;
const PROJECTILE_RADIUS = 3;
const ENEMY_RADIUS = 8;
const ENEMY_BAR_WIDTH = 20;
const ENEMY_BAR_HEIGHT = 3;
const ENEMY_BAR_OFFSET_X = 10;
const ENEMY_BAR_OFFSET_Y = 14;

// Default enemy path
const DEFAULT_PATH = [
  { x: 20, y: 20 },
  { x: 380, y: 20 },
  { x: 380, y: 200 },
  { x: 20, y: 200 },
  { x: 20, y: 380 },
];

const TARGET_MODES = ['first', 'last', 'strongest', 'closest'];

// Helpers for dynamic path handling
const computeSegments = (path) => {
  const segs = [];
  let len = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len: l });
    len += l;
  }
  return { segs, len };
};

const getPointAt = (segments, d) => {
  let dist = d;
  for (const seg of segments) {
    if (dist <= seg.len) {
      const t = dist / seg.len;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
      };
    }
    dist -= seg.len;
  }
  const last = segments[segments.length - 1];
  return { x: last.b.x, y: last.b.y };
};

const pointOnPath = (segments, px, py) => {
  const threshold = 15;
  for (const seg of segments) {
    const { a, b } = seg;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = Math.max(
      0,
      Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq)
    );
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    if (Math.hypot(px - projX, py - projY) < threshold) return true;
  }
  return false;
};

/**
 * Tower defense game component.
 * Handles rendering and game state for a simple path-based TD.
 * @returns {JSX.Element}
 */
function TowerDefense() {
  const canvasRef = useRef(null);
  const towersRef = useRef([]);
  const enemiesRef = useRef([]);
  const projectilesRef = useRef([]);
  const decalsRef = useRef([]);
  const damageNumbersRef = useRef([]);
  const shockwavesRef = useRef([]);
  const spawnRef = useRef({ count: 0, spawned: 0, timer: 0 });
  const [wave, setWave] = useState(1);
  const waveRef = useRef(wave);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const livesRef = useRef(lives);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  const [sound, setSound] = useState(true);
  const [fast, setFast] = useState(false);
  const speedRef = useRef(1);
  const audioCtxRef = useRef(null);
  const prefersReducedMotion = useRef(false);

  const [path, setPath] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('td-path') || 'null');
        if (saved && Array.isArray(saved) && saved.length) return saved;
      } catch (e) {
        /* ignore */
      }
    }
    return DEFAULT_PATH;
  });
  const pathRef = useRef(path);
  useEffect(() => { pathRef.current = path; }, [path]);
  const pathSegRef = useRef([]);
  const totalLengthRef = useRef(0);
  useEffect(() => {
    const { segs, len } = computeSegments(pathRef.current);
    pathSegRef.current = segs;
    totalLengthRef.current = len;
  }, [path]);

  const [editing, setEditing] = useState(false);
  const [selectedTower, setSelectedTower] = useState(null);

  useEffect(() => { waveRef.current = wave; }, [wave]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { speedRef.current = fast ? 2 : 1; }, [fast]);

  useEffect(() => {
    const hs =
      typeof window !== 'undefined'
        ? Number(localStorage.getItem('td-highscore') || 0)
        : 0;
    setHighScore(hs);
  }, []);

  useEffect(() => {
    if (score > highScore && typeof window !== 'undefined') {
      setHighScore(score);
      localStorage.setItem('td-highscore', String(score));
    }
  }, [score, highScore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  const playSound = useCallback(() => {
    if (!sound) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new Ctor();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      /* ignore */
    }
  }, [sound]);

  const startWave = useCallback((num) => {
    spawnRef.current = {
      count: BASE_SPAWN_COUNT + num * ENEMIES_PER_WAVE,
      spawned: 0,
      timer: 0,
    };
  }, []);

  useEffect(() => {
    startWave(1);
    setRunning(false);
    runningRef.current = false;
  }, [startWave]);

  const reset = useCallback(() => {
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    decalsRef.current = [];
    damageNumbersRef.current = [];
    shockwavesRef.current = [];
    setWave(1);
    waveRef.current = 1;
    setLives(INITIAL_LIVES);
    setScore(0);
    setRunning(false);
    runningRef.current = false;
    setFast(false);
    speedRef.current = 1;
    startWave(1);
  }, [startWave]);

  const handleClick = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (editing) {
        if (e.shiftKey) setPath((p) => p.slice(0, -1));
        else setPath((p) => [...p, { x, y }]);
        return;
      }

      const existing = towersRef.current.find(
        (t) => Math.hypot(t.x - x, t.y - y) < TOWER_PLACEMENT_RADIUS
      );
      if (existing) {
        if (e.shiftKey) {
          const idx = TARGET_MODES.indexOf(existing.mode || 'first');
          existing.mode = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
        } else if (!e.altKey && existing.level < TOWER_MAX_LEVEL) existing.level += 1;
        setSelectedTower(existing);
        return;
      }
      if (pointOnPath(pathSegRef.current, x, y)) return;
      const tower = { x, y, level: 1, cooldown: 0, mode: 'first' };
      towersRef.current.push(tower);
      setSelectedTower(tower);
    },
    [editing]
  );

  const saveMap = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('td-path', JSON.stringify(pathRef.current));
    }
  }, []);

  const loadMap = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('td-path') || 'null');
        if (saved && Array.isArray(saved) && saved.length) setPath(saved);
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  const resetMap = useCallback(() => setPath(DEFAULT_PATH), []);

  const spawnEnemies = (dt) => {
    const spawn = spawnRef.current;
    spawn.timer += dt;
    if (spawn.spawned < spawn.count && spawn.timer >= SPAWN_INTERVAL) {
      const hp = BASE_ENEMY_HP + waveRef.current * ENEMY_HP_PER_WAVE;
      const start = pathRef.current[0];
      enemiesRef.current.push({
        dist: 0,
        speed: BASE_ENEMY_SPEED + waveRef.current * ENEMY_SPEED_PER_WAVE,
        hp,
        maxHp: hp,
        x: start.x,
        y: start.y,
      });
      spawn.spawned += 1;
      spawn.timer = 0;
    }
  };

  const moveEnemies = (dt) => {
    enemiesRef.current.forEach((e) => {
      e.dist += e.speed * dt;
      const pos = getPointAt(pathSegRef.current, e.dist);
      e.x = pos.x;
      e.y = pos.y;
    });
  };

  const updateTowers = (dt) => {
    towersRef.current.forEach((t) => {
      t.cooldown = (t.cooldown || 0) - dt;
      const range = TOWER_BASE_RANGE + t.level * TOWER_RANGE_PER_LEVEL;
      let target = null;
      if (t.mode === 'first') {
        let maxDistPath = -Infinity;
        enemiesRef.current.forEach((e) => {
          const distToTower = Math.hypot(e.x - t.x, e.y - t.y);
          if (distToTower < range && e.dist > maxDistPath) {
            target = e;
            maxDistPath = e.dist;
          }
        });
      } else if (t.mode === 'last') {
        let minDistPath = Infinity;
        enemiesRef.current.forEach((e) => {
          const distToTower = Math.hypot(e.x - t.x, e.y - t.y);
          if (distToTower < range && e.dist < minDistPath) {
            target = e;
            minDistPath = e.dist;
          }
        });
      } else if (t.mode === 'strongest') {
        let maxHp = -Infinity;
        enemiesRef.current.forEach((e) => {
          const distToTower = Math.hypot(e.x - t.x, e.y - t.y);
          if (distToTower < range && e.hp > maxHp) {
            target = e;
            maxHp = e.hp;
          }
        });
      } else {
        let minDist = Infinity;
        enemiesRef.current.forEach((e) => {
          const distToTower = Math.hypot(e.x - t.x, e.y - t.y);
          if (distToTower < range && distToTower < minDist) {
            target = e;
            minDist = distToTower;
          }
        });
      }
      if (target && t.cooldown <= 0) {
        projectilesRef.current.push({
          x: t.x,
          y: t.y,
          target,
          speed: PROJECTILE_SPEED,
          damage: PROJECTILE_DAMAGE * t.level,
          trail: [],
        });
        t.cooldown = PROJECTILE_COOLDOWN;
      }
    });
  };

  const updateProjectiles = (dt) => {
    projectilesRef.current.forEach((p) => {
      if (!p.target) return;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > PROJECTILE_TRAIL_LIMIT) p.trail.shift();
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const vx = (dx / dist) * p.speed;
      const vy = (dy / dist) * p.speed;
      p.x += vx * dt;
      p.y += vy * dt;
      if (dist < PROJECTILE_HIT_DISTANCE || p.target.hp <= 0) {
        if (p.target.hp > 0) {
          p.target.hp -= p.damage;
          damageNumbersRef.current.push({
            x: p.target.x,
            y: p.target.y,
            dmg: p.damage,
            vy: DAMAGE_NUMBER_VY,
            ttl: DAMAGE_NUMBER_TTL,
          });
          enemiesRef.current.forEach((e) => {
            if (e !== p.target) {
              const d = Math.hypot(e.x - p.x, e.y - p.y);
              if (d < AOE_RADIUS) {
                e.hp -= p.damage;
                damageNumbersRef.current.push({
                  x: e.x,
                  y: e.y,
                  dmg: p.damage,
                  vy: DAMAGE_NUMBER_VY,
                  ttl: DAMAGE_NUMBER_TTL,
                });
              }
            }
          });
          shockwavesRef.current.push({ x: p.x, y: p.y, r: 0, ttl: SHOCKWAVE_TTL });
        }
        decalsRef.current.push({ x: p.x, y: p.y, ttl: DECAL_TTL });
        p.hit = true;
      }
    });
    projectilesRef.current = projectilesRef.current.filter(
      (p) => !p.hit && p.target.hp > 0
    );
  };

  const updateEffects = (dt) => {
    decalsRef.current.forEach((d) => {
      d.ttl -= dt;
    });
    decalsRef.current = decalsRef.current.filter((d) => d.ttl > 0);

    damageNumbersRef.current.forEach((n) => {
      n.ttl -= dt;
      n.vy += DAMAGE_NUMBER_ACCEL * dt;
      n.y += n.vy * dt;
    });
    damageNumbersRef.current = damageNumbersRef.current.filter((n) => n.ttl > 0);

    shockwavesRef.current.forEach((s) => {
      s.ttl -= dt;
      s.r += SHOCKWAVE_GROWTH * dt;
    });
    shockwavesRef.current = shockwavesRef.current.filter((s) => s.ttl > 0);
  };

  const cleanupEnemies = () => {
    enemiesRef.current = enemiesRef.current.filter((e) => {
      if (e.hp <= 0) {
        setScore((s) => s + 1);
        playSound();
        return false;
      }
      if (e.dist >= totalLengthRef.current) {
        setLives((l) => l - 1);
        return false;
      }
      return true;
    });
  };

  const checkWaveCompletion = () => {
    const spawn = spawnRef.current;
    if (
      spawn.spawned >= spawn.count &&
      enemiesRef.current.length === 0 &&
      livesRef.current > 0
    ) {
      const next = waveRef.current + 1;
      waveRef.current = next;
      setWave(next);
      startWave(next);
      setRunning(false);
      runningRef.current = false;
    }
  };

  const update = (dt) => {
    spawnEnemies(dt);
    moveEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateEffects(dt);
    cleanupEnemies();
    checkWaveCompletion();
  };

  const draw = (ctx) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const p = pathRef.current;
    if (p.length) {
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i += 1) ctx.lineTo(p[i].x, p[i].y);
    }
    ctx.stroke();
    if (editing) {
      ctx.fillStyle = '#0f0';
      p.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    decalsRef.current.forEach((d) => {
      const alpha = prefersReducedMotion.current ? 1 : d.ttl / DECAL_TTL;
      ctx.fillStyle = `rgba(255,255,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, DECAL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    shockwavesRef.current.forEach((s) => {
      const alpha = prefersReducedMotion.current ? 1 : s.ttl / SHOCKWAVE_TTL;
      ctx.strokeStyle = `rgba(255,255,0,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    towersRef.current.forEach((t) => {
      const range = 60 + t.level * 10;
      ctx.strokeStyle = 'rgba(0,0,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(t.x, t.y, TOWER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.fillText(t.level, t.x - 3, t.y + 3);
      ctx.fillText((t.mode ? t.mode[0] : 'f').toUpperCase(), t.x - 5, t.y + 15);
    });

    enemiesRef.current.forEach((e) => {
      ctx.fillStyle = '#b00';
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(
        e.x - ENEMY_BAR_OFFSET_X,
        e.y - ENEMY_BAR_OFFSET_Y,
        ENEMY_BAR_WIDTH,
        ENEMY_BAR_HEIGHT
      );
      ctx.fillStyle = '#0f0';
      ctx.fillRect(
        e.x - ENEMY_BAR_OFFSET_X,
        e.y - ENEMY_BAR_OFFSET_Y,
        (ENEMY_BAR_WIDTH * e.hp) / e.maxHp,
        ENEMY_BAR_HEIGHT
      );
    });

    damageNumbersRef.current.forEach((n) => {
      const alpha = n.ttl;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = '12px sans-serif';
      ctx.fillText(n.dmg, n.x, n.y);
    });

    projectilesRef.current.forEach((p) => {
      if (!prefersReducedMotion.current) {
        ctx.strokeStyle = 'rgba(255,255,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const tr = p.trail;
        if (tr.length) {
          ctx.moveTo(tr[0].x, tr[0].y);
          for (let i = 1; i < tr.length; i += 1) ctx.lineTo(tr[i].x, tr[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let last = performance.now();
    let frameId;
    const frame = (time) => {
      const dt = ((time - last) / 1000) * speedRef.current;
      last = time;
      if (runningRef.current) update(dt);
      draw(ctx);
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lives <= 0) setRunning(false);
  }, [lives]);

  const nextWave = wave + 1;
  const upcoming = {
    count: BASE_SPAWN_COUNT + nextWave * ENEMIES_PER_WAVE,
    hp: BASE_ENEMY_HP + nextWave * ENEMY_HP_PER_WAVE,
    speed: BASE_ENEMY_SPEED + nextWave * ENEMY_SPEED_PER_WAVE,
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-2">
      <div className="mb-2" aria-live="polite" role="status">
        <span className="mr-4">Wave: {wave}</span>
        <span className="mr-4">Lives: {lives}</span>
        <span className="mr-4">Score: {score}</span>
        <span>Highscore: {highScore}</span>
      </div>
      <div className="mb-2 text-sm">{`Next Wave: ${upcoming.count} enemies, HP ${upcoming.hp}, Speed ${upcoming.speed}`}</div>
      {selectedTower && (
        <div className="mb-2 text-sm">
          <div>
            {`Tower Lv ${selectedTower.level} (${selectedTower.mode})`}
          </div>
          <div>
            {`Damage: ${PROJECTILE_DAMAGE * selectedTower.level}, Range: ${
              TOWER_BASE_RANGE + selectedTower.level * TOWER_RANGE_PER_LEVEL
            }`}
          </div>
          {selectedTower.level < TOWER_MAX_LEVEL && (
            <div>
              {`Next Lv Damage: ${
                PROJECTILE_DAMAGE * (selectedTower.level + 1)
              }, Range: ${
                TOWER_BASE_RANGE +
                (selectedTower.level + 1) * TOWER_RANGE_PER_LEVEL
              }`}
            </div>
          )}
        </div>
      )}
      <div className="mb-2 flex space-x-2">
        <button
          type="button"
          className="px-2 bg-gray-700"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          className="px-2 bg-gray-700"
          onClick={() => setFast((f) => !f)}
        >
          {fast ? 'Speed: 2x' : 'Speed: 1x'}
        </button>
        <button type="button" className="px-2 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          className="px-2 bg-gray-700"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
      </div>
      <div className="mb-2 flex space-x-2">
        <button
          type="button"
          className="px-2 bg-gray-700"
          onClick={() => {
            setEditing((e) => !e);
            if (!editing) setRunning(false);
          }}
        >
          {editing ? 'Done' : 'Edit Map'}
        </button>
        {editing && (
          <>
            <button type="button" className="px-2 bg-gray-700" onClick={saveMap}>
              Save
            </button>
            <button type="button" className="px-2 bg-gray-700" onClick={loadMap}>
              Load
            </button>
            <button type="button" className="px-2 bg-gray-700" onClick={resetMap}>
              Reset
            </button>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="bg-black"
        onClick={handleClick}
      />
    </div>
  );
}

export default TowerDefense;
