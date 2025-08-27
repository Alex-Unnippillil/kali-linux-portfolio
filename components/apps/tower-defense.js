import React, { useRef, useEffect, useState } from 'react';

const WIDTH = 400;
const HEIGHT = 400;

// Simple fixed path
const PATH = [
  { x: 20, y: 20 },
  { x: 380, y: 20 },
  { x: 380, y: 200 },
  { x: 20, y: 200 },
  { x: 20, y: 380 },
];

const TARGET_MODES = ['first', 'last', 'strongest', 'closest'];

// Precompute path segments and length
const pathSegments = [];
let totalLength = 0;
for (let i = 0; i < PATH.length - 1; i += 1) {
  const a = PATH[i];
  const b = PATH[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  pathSegments.push({ a, b, len });
  totalLength += len;
}

const getPointAt = (d) => {
  let dist = d;
  for (const seg of pathSegments) {
    if (dist <= seg.len) {
      const t = dist / seg.len;
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
      };
    }
    dist -= seg.len;
  }
  const last = pathSegments[pathSegments.length - 1];
  return { x: last.b.x, y: last.b.y };
};

const pointOnPath = (px, py) => {
  const threshold = 15;
  for (const seg of pathSegments) {
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
    const dist = Math.hypot(px - projX, py - projY);
    if (dist < threshold) return true;
  }
  return false;
};

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
  const [lives, setLives] = useState(10);
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

  const playSound = () => {
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
  };

  const startWave = (num) => {
    spawnRef.current = { count: 5 + num * 2, spawned: 0, timer: 0 };
  };

  useEffect(() => {
    startWave(1);
    setRunning(false);
    runningRef.current = false;
  }, []);

  const reset = () => {
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    decalsRef.current = [];
    damageNumbersRef.current = [];
    shockwavesRef.current = [];
    setWave(1);
    waveRef.current = 1;
    setLives(10);
    setScore(0);
    setRunning(false);
    runningRef.current = false;
    setFast(false);
    speedRef.current = 1;
    startWave(1);
  };

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const existing = towersRef.current.find(
      (t) => Math.hypot(t.x - x, t.y - y) < 15
    );
    if (existing) {
      if (e.shiftKey) {
        const idx = TARGET_MODES.indexOf(existing.mode || 'first');
        existing.mode = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
      } else if (existing.level < 3) existing.level += 1;
      return;
    }
    if (pointOnPath(x, y)) return;
    towersRef.current.push({ x, y, level: 1, cooldown: 0, mode: 'first' });
  };

  const update = (dt) => {
    const spawn = spawnRef.current;
    spawn.timer += dt;
    if (spawn.spawned < spawn.count && spawn.timer >= 0.5) {
      enemiesRef.current.push({
        dist: 0,
        speed: 40 + waveRef.current * 5,
        hp: 10 + waveRef.current * 2,
        maxHp: 10 + waveRef.current * 2,
        x: PATH[0].x,
        y: PATH[0].y,
      });
      spawn.spawned += 1;
      spawn.timer = 0;
    }

    enemiesRef.current.forEach((e) => {
      e.dist += e.speed * dt;
      const pos = getPointAt(e.dist);
      e.x = pos.x;
      e.y = pos.y;
    });

    towersRef.current.forEach((t) => {
      t.cooldown = (t.cooldown || 0) - dt;
      const range = 60 + t.level * 10;
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
          speed: 200,
          damage: 5 * t.level,
          trail: [],
        });
        t.cooldown = 0.5;
      }
    });

    projectilesRef.current.forEach((p) => {
      if (!p.target) return;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.shift();
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const vx = (dx / dist) * p.speed;
      const vy = (dy / dist) * p.speed;
      p.x += vx * dt;
      p.y += vy * dt;
      if (dist < 5 || p.target.hp <= 0) {
        if (p.target.hp > 0) {
          p.target.hp -= p.damage;
          damageNumbersRef.current.push({
            x: p.target.x,
            y: p.target.y,
            dmg: p.damage,
            vy: -30,
            ttl: 1,
          });
          const radius = 30;
          enemiesRef.current.forEach((e) => {
            if (e !== p.target) {
              const d = Math.hypot(e.x - p.x, e.y - p.y);
              if (d < radius) {
                e.hp -= p.damage;
                damageNumbersRef.current.push({
                  x: e.x,
                  y: e.y,
                  dmg: p.damage,
                  vy: -30,
                  ttl: 1,
                });
              }
            }
          });
          shockwavesRef.current.push({ x: p.x, y: p.y, r: 0, ttl: 0.3 });
        }
        decalsRef.current.push({ x: p.x, y: p.y, ttl: 0.3 });
        p.hit = true;
      }
    });
    projectilesRef.current = projectilesRef.current.filter(
      (p) => !p.hit && p.target.hp > 0
    );

    decalsRef.current.forEach((d) => {
      d.ttl -= dt;
    });
    decalsRef.current = decalsRef.current.filter((d) => d.ttl > 0);

    damageNumbersRef.current.forEach((n) => {
      n.ttl -= dt;
      n.vy += 200 * dt;
      n.y += n.vy * dt;
    });
    damageNumbersRef.current = damageNumbersRef.current.filter((n) => n.ttl > 0);

    shockwavesRef.current.forEach((s) => {
      s.ttl -= dt;
      s.r += 200 * dt;
    });
    shockwavesRef.current = shockwavesRef.current.filter((s) => s.ttl > 0);

    enemiesRef.current = enemiesRef.current.filter((e) => {
      if (e.hp <= 0) {
        setScore((s) => s + 1);
        playSound();
        return false;
      }
      if (e.dist >= totalLength) {
        setLives((l) => l - 1);
        return false;
      }
      return true;
    });

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

  const draw = (ctx) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
    ctx.stroke();

    decalsRef.current.forEach((d) => {
      const alpha = prefersReducedMotion.current ? 1 : d.ttl / 0.3;
      ctx.fillStyle = `rgba(255,255,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    shockwavesRef.current.forEach((s) => {
      const alpha = prefersReducedMotion.current ? 1 : s.ttl / 0.3;
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
      ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.fillText(t.level, t.x - 3, t.y + 3);
      ctx.fillText((t.mode ? t.mode[0] : 'f').toUpperCase(), t.x - 5, t.y + 15);
    });

    enemiesRef.current.forEach((e) => {
      ctx.fillStyle = '#b00';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - 10, e.y - 14, 20, 3);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(e.x - 10, e.y - 14, (20 * e.hp) / e.maxHp, 3);
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
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
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
  }, []);

  useEffect(() => {
    if (lives <= 0) setRunning(false);
  }, [lives]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-2">
      <div className="mb-2" aria-live="polite" role="status">
        <span className="mr-4">Wave: {wave}</span>
        <span className="mr-4">Lives: {lives}</span>
        <span className="mr-4">Score: {score}</span>
        <span>Highscore: {highScore}</span>
      </div>
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
