import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import { vibrate } from './Games/common/haptics';

const WIDTH = 7;
const HEIGHT = 8;
const SUB_STEP = 0.5;
const CELL = 32;
const RIPPLE_DURATION = 0.5;

const PAD_POSITIONS = [1, 3, 5];
const DIFFICULTY_MULTIPLIERS = {
  easy: 0.8,
  normal: 1,
  hard: 1.2,
};

const makeRng = (seed) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const handlePads = (frogPos, pads) => {
  if (frogPos.y !== 0) return { pads, dead: false, levelComplete: false, padHit: false };
  const idx = PAD_POSITIONS.indexOf(Math.floor(frogPos.x));
  if (idx === -1 || pads[idx]) {
    return { pads, dead: true, levelComplete: false, padHit: false };
  }
  const newPads = [...pads];
  newPads[idx] = true;
  const levelComplete = newPads.every(Boolean);
  return { pads: newPads, dead: false, levelComplete, padHit: true };
};

const rampLane = (base, level, minSpawn, diffMult = 1) => ({
  ...base,
  speed: base.speed * diffMult * (1 + (level - 1) * 0.2),
  spawnRate: Math.max(minSpawn, base.spawnRate * (1 - (level - 1) * 0.1)),
});

const initialFrog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

const carLaneDefs = [
  { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
  { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
];

const logLaneDefs = [
  { y: 1, dir: -1, speed: 0.5, spawnRate: 2.5, length: 2 },
  { y: 2, dir: 1, speed: 0.7, spawnRate: 2.2, length: 2 },
];

const initLane = (lane, seed) => {
  const rng = makeRng(seed);
  return {
    ...lane,
    entities: [],
    rng,
    timer: lane.spawnRate * (0.5 + rng()),
  };
};

const updateCars = (prev, frogPos, dt) => {
  let dead = false;
  const newLanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (
        lane.y === frogPos.y &&
        entities.some((e) => frogPos.x < e.x + lane.length && frogPos.x + 1 > e.x)
      )
        dead = true;
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  return { lanes: newLanes, dead };
};

const updateLogs = (prev, frogPos, dt) => {
  let newFrog = { ...frogPos };
  let safe = false;
  const newLanes = prev.map((lane) => {
    let timer = lane.timer - dt;
    let entities = lane.entities;
    const dist = lane.dir * lane.speed * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / SUB_STEP));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i += 1) {
      entities = entities.map((e) => ({ ...e, x: e.x + stepDist }));
      if (
        newFrog.y === lane.y &&
        entities.some((e) => e.x <= newFrog.x && newFrog.x < e.x + lane.length)
      ) {
        newFrog.x += stepDist;
        safe = true;
      }
    }
    entities = entities.filter((e) => e.x + lane.length > 0 && e.x < WIDTH);
    if (timer <= 0) {
      entities.push({ x: lane.dir === 1 ? -lane.length : WIDTH });
      timer += lane.spawnRate * (0.5 + lane.rng());
    }
    return { ...lane, entities, timer };
  });
  const dead = (newFrog.y === 1 || newFrog.y === 2) && !safe;
  return { lanes: newLanes, frog: newFrog, dead };
};

const Frogger = () => {
  const [frog, setFrog] = useState(initialFrog);
  const frogRef = useRef(frog);
  const [cars, setCars] = useState(carLaneDefs.map((l, i) => initLane(l, i + 1)));
  const carsRef = useRef(cars);
  const [logs, setLogs] = useState(logLaneDefs.map((l, i) => initLane(l, i + 101)));
  const logsRef = useRef(logs);
  const [pads, setPads] = useState(PAD_POSITIONS.map(() => false));
  const padsRef = useRef(pads);
  const [status, setStatus] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState('normal');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  const [highScore, setHighScore] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(reduceMotion);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const nextLife = useRef(500);
  const holdRef = useRef();
  const rippleRef = useRef(0);
  const splashesRef = useRef([]);
  const [slowTime, setSlowTime] = useState(false);
  const slowTimeRef = useRef(slowTime);
  const deathStreakRef = useRef(0);
  const safeFlashRef = useRef(0);


  useEffect(() => { frogRef.current = frog; }, [frog]);
  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);
  useEffect(() => { slowTimeRef.current = slowTime; }, [slowTime]);

  useEffect(() => {
    const saved = Number(localStorage.getItem('frogger-highscore') || 0);
    setHighScore(saved);
  }, []);
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('frogger-highscore', String(score));
      } catch {
        /* ignore */
      }
    }
  }, [score, highScore]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const playTone = (freq, duration = 0.1) => {
    if (!soundRef.current) return;
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const moveFrog = useCallback((dx, dy) => {
    if (pausedRef.current) return;
    setFrog((prev) => {
      const x = prev.x + dx;
      const y = prev.y + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return prev;
      vibrate(50);
      if (dy === -1) setScore((s) => s + 10);
      playTone(440, 0.05);
      return { x, y };
    });
  }, [setFrog, setScore]);

  const startHold = useCallback(
    (dx, dy) => {
      moveFrog(dx, dy);
      holdRef.current = setInterval(() => moveFrog(dx, dy), 220);
    },
    [moveFrog],
  );

  const endHold = useCallback(() => {
    clearInterval(holdRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      else if (e.key === 'ArrowRight') moveFrog(1, 0);
      else if (e.key === 'ArrowUp') moveFrog(0, -1);
      else if (e.key === 'ArrowDown') moveFrog(0, 1);
      else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p);
      else if (e.key === 'm' || e.key === 'M') setSound((s) => !s);
      else if (e.key === 't' || e.key === 'T') setSlowTime((s) => !s);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveFrog]);

  useEffect(() => {
    const container = document.getElementById('frogger-container');
    let startX = 0;
    let startY = 0;
    const handleStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) moveFrog(1, 0);
        else if (dx < -30) moveFrog(-1, 0);
      } else {
        if (dy > 30) moveFrog(0, 1);
        else if (dy < -30) moveFrog(0, -1);
      }
    };
    container?.addEventListener('touchstart', handleStart);
    container?.addEventListener('touchend', handleEnd);
    return () => {
      container?.removeEventListener('touchstart', handleStart);
      container?.removeEventListener('touchend', handleEnd);
    };
  }, [moveFrog]);

  useEffect(() => {
    ReactGA.event({ category: 'Frogger', action: 'level_start', value: 1 });
  }, []);

  const reset = useCallback(
    (full = false, diff = difficulty, lvl = level) => {
      setFrog(initialFrog);
      const mult = DIFFICULTY_MULTIPLIERS[diff];
      setCars(
        carLaneDefs.map((l, i) =>
          initLane(rampLane(l, lvl, 0.3, mult), i + 1)
        )
      );
      setLogs(
        logLaneDefs.map((l, i) =>
          initLane(rampLane(l, lvl, 0.5, mult), i + 101)
        )
      );
      setStatus('');
      if (full) {
        setScore(0);
        setLives(3);
        setPads(PAD_POSITIONS.map(() => false));
        setLevel(1);
        nextLife.current = 500;
        deathStreakRef.current = 0;
        ReactGA.event({
          category: 'Frogger',
          action: 'level_start',
          value: 1,
        });
      }
    },
    [difficulty, level]
  );

  const loseLife = useCallback(
    (pos) => {
      if (pos && pos.y <= 2) {
        splashesRef.current.push({
          x: (Math.floor(pos.x) + 0.5) * CELL,
          y: (pos.y + 0.5) * CELL,
          t: 0,
        });
      }
      deathStreakRef.current += 1;
      if (deathStreakRef.current >= 2) safeFlashRef.current = 2;
      ReactGA.event({ category: 'Frogger', action: 'death', value: level });
      playTone(220, 0.2);
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setStatus('Game Over');
          setTimeout(() => reset(true), 1000);
          return 0;
        }
        reset();
        return newLives;
      });
    },
    [level, reset]
  );

  useEffect(() => {
    let last = performance.now();
    let raf;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const phase = rippleRef.current;
      for (let y = 0; y < HEIGHT; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          if (y === 0) {
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(x * CELL, 0, CELL, CELL);
            const idx = PAD_POSITIONS.indexOf(x);
            if (idx >= 0) {
              const color = padsRef.current[idx] ? '#22c55e' : '#15803d';
              const bob = Math.sin(phase + x) * 2;
              ctx.fillStyle = color;
              ctx.fillRect(x * CELL, bob, CELL, CELL);
            }
          } else if (y === 3 || y === 6) {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            if (safeFlashRef.current > 0 && Math.floor(phase * 8) % 2 === 0) {
              ctx.fillStyle = 'rgba(251,191,36,0.5)';
              ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
          } else if (y >= 4 && y <= 5) {
            ctx.fillStyle = '#374151';
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(x * CELL, y * CELL, CELL, 4);
            ctx.fillStyle = '#111827';
            ctx.fillRect(x * CELL, y * CELL + CELL - 4, CELL, 4);
          } else {
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
      const rippleColor = '#93c5fd';
      if (reduceMotionRef.current) {
        ctx.fillStyle = rippleColor;
        for (let x = 0; x < WIDTH; x += 1) {
          ctx.fillRect(x * CELL, CELL, CELL, 4);
          ctx.fillRect(x * CELL, CELL * 3 - 4, CELL, 4);
        }
      } else {
        ctx.fillStyle = rippleColor;
        for (let x = 0; x < WIDTH; x += 1) {
          const offset = Math.sin(phase + x) * 2;
          ctx.fillRect(x * CELL, CELL + offset, CELL, 4);
          ctx.fillRect(x * CELL, CELL * 3 - 4 + offset, CELL, 4);
        }
      }
      logsRef.current.forEach((lane) => {
        ctx.fillStyle = '#d97706';
        lane.entities.forEach((e) => {
          ctx.fillRect(e.x * CELL, lane.y * CELL, lane.length * CELL, CELL);
        });
      });
      carsRef.current.forEach((lane) => {
        lane.entities.forEach((e) => {
          const x = e.x * CELL;
          const y = lane.y * CELL;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x, y, lane.length * CELL, CELL);
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x - lane.dir * 8, y, lane.length * CELL, CELL);
          ctx.globalAlpha = 1;
        });
      });
      splashesRef.current.forEach((sp) => {
        const progress = sp.t / RIPPLE_DURATION;
        const radius = progress * CELL;
        ctx.strokeStyle = rippleColor;
        ctx.globalAlpha = 1 - progress;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(frogRef.current.x * CELL, frogRef.current.y * CELL, CELL, CELL);
      if (pausedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      }
    };
    const loop = (time) => {
      const rawDt = (time - last) / 1000;
      last = time;
      const dt = rawDt * (slowTimeRef.current ? 0.7 : 1);
      rippleRef.current += dt * 4;
      if (safeFlashRef.current > 0) safeFlashRef.current -= dt;
      splashesRef.current = splashesRef.current
        .map((s) => ({ ...s, t: s.t + dt }))
        .filter((s) => s.t < RIPPLE_DURATION);

      const carResult = updateCars(carsRef.current, frogRef.current, dt);
      carsRef.current = carResult.lanes;
      const logResult = updateLogs(logsRef.current, frogRef.current, dt);
      logsRef.current = logResult.lanes;
      frogRef.current = logResult.frog;
      if (
        carResult.dead ||
        logResult.dead ||
        frogRef.current.x < 0 ||
        frogRef.current.x >= WIDTH
      ) {
        loseLife(frogRef.current);
        frogRef.current = { ...initialFrog };
      } else {
        const padResult = handlePads(frogRef.current, padsRef.current);
        padsRef.current = padResult.pads;
        if (padResult.dead) {
          loseLife(frogRef.current);
          frogRef.current = { ...initialFrog };
        } else if (padResult.levelComplete) {
          setStatus('Level Complete!');
          setScore((s) => s + 100);
          playTone(880, 0.2);
          ReactGA.event({
            category: 'Frogger',
            action: 'level_complete',
            value: level,
          });
          const newLevel = level + 1;
          setLevel(newLevel);
          ReactGA.event({
            category: 'Frogger',
            action: 'level_start',
            value: newLevel,
          });
          setPads(PAD_POSITIONS.map(() => false));
          reset(false, difficulty, newLevel);
          deathStreakRef.current = 0;
          frogRef.current = { ...initialFrog };
        } else if (padResult.padHit) {
          setScore((s) => s + 100);
          setPads([...padsRef.current]);
          playTone(660, 0.1);
          deathStreakRef.current = 0;
          frogRef.current = { ...initialFrog };
        }
      }
      setFrog({ ...frogRef.current });
      setCars([...carsRef.current]);
      setLogs([...logsRef.current]);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [difficulty, level, loseLife, reset]);

  useEffect(() => {
    if (score >= nextLife.current) {
      setLives((l) => l + 1);
      nextLife.current += 500;
    }
  }, [score]);

  // lanes are initialized via reset using current level and difficulty

  const mobileControls = [
    null,
    { dx: 0, dy: -1, label: '↑' },
    null,
    { dx: -1, dy: 0, label: '←' },
    null,
    { dx: 1, dy: 0, label: '→' },
    null,
    { dx: 0, dy: 1, label: '↓' },
    null,
  ];

  return (
    <div
      id="frogger-container"
      className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4"
    >
      <canvas
        ref={canvasRef}
        width={WIDTH * CELL}
        height={HEIGHT * CELL}
        className="border border-gray-700"
      />
      <div className="mt-4" aria-live="polite">
        Score: {score} High: {highScore} Lives: {lives}
      </div>
      <div className="mt-1" role="status" aria-live="polite">
        {status}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => setSound((s) => !s)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={() => setSlowTime((s) => !s)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Time: {slowTime ? 'Slow' : 'Normal'}
        </button>
        <label htmlFor="difficulty">Difficulty:</label>
        <select
          id="difficulty"
          className="bg-gray-700"
          value={difficulty}
          onChange={(e) => {
            const diff = e.target.value;
            setDifficulty(diff);
            reset(true, diff);
          }}
        >
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-4 sm:hidden">
        {mobileControls.map((c, i) =>
          c ? (
            <button
              key={i}
              className="w-12 h-12 bg-gray-700 opacity-50 flex items-center justify-center"
              onTouchStart={() => startHold(c.dx, c.dy)}
              onTouchEnd={endHold}
              onMouseDown={() => startHold(c.dx, c.dy)}
              onMouseUp={endHold}
              onMouseLeave={endHold}
            >
              {c.label}
            </button>
          ) : (
            <div key={i} className="w-12 h-12" />
          ),
        )}
      </div>
    </div>
  );
};

export default Frogger;

export {
  makeRng,
  initLane,
  updateCars,
  updateLogs,
  handlePads,
  PAD_POSITIONS,
  carLaneDefs,
  logLaneDefs,
  rampLane,
};
