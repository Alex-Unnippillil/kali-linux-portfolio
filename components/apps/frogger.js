import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import { useGameLoop } from './Games/common';
import { vibrate } from './Games/common/haptics';
import {
  generateLaneConfig,
  SKINS,
  getRandomSkin,
} from '../../apps/games/frogger/config';
import { getLevelConfig } from '../../apps/games/frogger/levels';
import { safeLocalStorage } from '../../utils/safeStorage';

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

const initialFrog = { x: Math.floor(WIDTH / 2), y: HEIGHT - 1 };

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
  // snap frog to integer grid to keep movement aligned
  newFrog.x = Math.round(newFrog.x);
  const dead = (newFrog.y === 1 || newFrog.y === 2) && !safe;
  return { lanes: newLanes, frog: newFrog, dead };
};

export const FROGGER_HIGHSCORE_KEY = 'frogger-highscore';

export const loadFroggerHighScore = (storage = safeLocalStorage) => {
  if (!storage) return 0;
  const raw = storage.getItem(FROGGER_HIGHSCORE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const persistFroggerHighScore = (score, storage = safeLocalStorage) => {
  if (!storage) return;
  const safeScore = Math.max(0, Math.floor(score));
  storage.setItem(FROGGER_HIGHSCORE_KEY, String(safeScore));
};

export const syncFroggerHighScore = (score, storage = safeLocalStorage) => {
  const current = loadFroggerHighScore(storage);
  if (score > current) {
    persistFroggerHighScore(score, storage);
    return score;
  }
  return current;
};

const Frogger = () => {
  const [frog, setFrog] = useState(initialFrog);
  const frogRef = useRef(frog);
  const initialLanes = generateLaneConfig(
    1,
    DIFFICULTY_MULTIPLIERS.normal,
    getLevelConfig(1),
  );
  const [cars, setCars] = useState(
    initialLanes.cars.map((l, i) => initLane(l, i + 1)),
  );
  const carsRef = useRef(cars);
  const [logs, setLogs] = useState(
    initialLanes.logs.map((l, i) => initLane(l, i + 101)),
  );
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
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  const [highScore, setHighScore] = useState(() => loadFroggerHighScore());
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
  const [skin, setSkin] = useState(getRandomSkin);
  const [showHitboxes, setShowHitboxes] = useState(false);
  const deathStreakRef = useRef(0);
  const safeFlashRef = useRef(0);
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const statusRef = useRef(status);
  const hitFlashRef = useRef(0);
  const pendingDeathRef = useRef(null);


  useEffect(() => { frogRef.current = frog; }, [frog]);
  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);
  useEffect(() => { slowTimeRef.current = slowTime; }, [slowTime]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (score <= highScore) return;
    const updated = syncFroggerHighScore(score);
    if (updated !== highScore) setHighScore(updated);
  }, [score, highScore]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const playTone = (freq, duration = 0.1) => {
    if (mutedRef.current) return;
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
      else if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
      else if (e.key === 'r' || e.key === 'R') reset(true);
      else if (e.key === 't' || e.key === 'T') setSlowTime((s) => !s);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveFrog, reset]);

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
      const base = getLevelConfig(lvl);
      const lanes = generateLaneConfig(lvl, mult, base);
      setCars(lanes.cars.map((l, i) => initLane(l, i + 1)));
      setLogs(lanes.logs.map((l, i) => initLane(l, i + 101)));
      setStatus('');
      pendingDeathRef.current = null;
      if (full) {
        setScore(0);
        setLives(3);
        setPads(PAD_POSITIONS.map(() => false));
        setLevel(1);
        setSkin(getRandomSkin());
        nextLife.current = 500;
        deathStreakRef.current = 0;
        setPaused(false);
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

  const ctxRef = useRef(null);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const colors = SKINS[skin];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const phase = rippleRef.current;
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (y === 0) {
          ctx.fillStyle = colors.water;
          ctx.fillRect(x * CELL, 0, CELL, CELL);
          const idx = PAD_POSITIONS.indexOf(x);
          if (idx >= 0) {
            const padColor = padsRef.current[idx]
              ? colors.frog
              : colors.grass;
            const bob = Math.sin(phase + x) * 2;
            ctx.fillStyle = padColor;
            ctx.fillRect(x * CELL, bob, CELL, CELL);
          }
        } else if (y === 3 || y === 6) {
          ctx.fillStyle = colors.grass;
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
          ctx.fillStyle = colors.water;
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
      const bgOffset = ((phase * lane.speed * lane.dir * 20) % CELL) - CELL;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = bgOffset; x < WIDTH * CELL + CELL; x += CELL) {
        ctx.fillRect(x, lane.y * CELL, CELL / 8, CELL);
      }
    });
    carsRef.current.forEach((lane) => {
      const bgOffset = ((phase * lane.speed * lane.dir * 20) % CELL) - CELL;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for (let x = bgOffset; x < WIDTH * CELL + CELL; x += CELL) {
        ctx.fillRect(x, lane.y * CELL, CELL / 4, CELL);
      }
    });
    logsRef.current.forEach((lane) => {
      ctx.fillStyle = colors.log;
      lane.entities.forEach((e) => {
        ctx.fillRect(e.x * CELL, lane.y * CELL, lane.length * CELL, CELL);
      });
    });
    carsRef.current.forEach((lane) => {
      lane.entities.forEach((e) => {
        const x = e.x * CELL;
        const y = lane.y * CELL;
        ctx.fillStyle = colors.car;
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
    ctx.fillStyle = colors.frog;
    ctx.fillRect(frogRef.current.x * CELL, frogRef.current.y * CELL, CELL, CELL);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Lives: ${livesRef.current}`, 4, 12);
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${levelRef.current}`, canvas.width - 4, 12);
    if (showHitboxes) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      logsRef.current.forEach((lane) => {
        lane.entities.forEach((e) => {
          ctx.strokeRect(
            e.x * CELL,
            lane.y * CELL,
            lane.length * CELL,
            CELL,
          );
        });
      });
      carsRef.current.forEach((lane) => {
        lane.entities.forEach((e) => {
          ctx.strokeRect(
            e.x * CELL,
            lane.y * CELL,
            lane.length * CELL,
            CELL,
          );
        });
      });
      ctx.strokeRect(
        frogRef.current.x * CELL,
        frogRef.current.y * CELL,
        CELL,
        CELL,
      );
    }
    if (hitFlashRef.current > 0) {
      ctx.fillStyle = `rgba(255,255,255,${hitFlashRef.current / 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (pausedRef.current || statusRef.current) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        pausedRef.current ? 'Paused' : statusRef.current,
        canvas.width / 2,
        canvas.height / 2,
      );
    }
  }, [showHitboxes, skin]);

  const step = useCallback(
    (delta) => {
      if (!ctxRef.current) return;
      const dt = delta * (slowTimeRef.current ? 0.7 : 1);
      if (pausedRef.current) {
        drawScene();
        return;
      }
      rippleRef.current += dt * 4;
      if (safeFlashRef.current > 0) safeFlashRef.current -= dt;
      if (hitFlashRef.current > 0) hitFlashRef.current -= dt;
      splashesRef.current = splashesRef.current
        .map((s) => ({ ...s, t: s.t + dt }))
        .filter((s) => s.t < RIPPLE_DURATION);
      if (pendingDeathRef.current) {
        if (hitFlashRef.current <= 0) {
          loseLife(pendingDeathRef.current);
          frogRef.current = { ...initialFrog };
          pendingDeathRef.current = null;
        }
        drawScene();
        return;
      }

      const carResult = updateCars(carsRef.current, frogRef.current, dt);
      carsRef.current = carResult.lanes;
      const logResult = updateLogs(logsRef.current, frogRef.current, dt);
      logsRef.current = logResult.lanes;
      frogRef.current = logResult.frog;
      if (carResult.dead) {
        hitFlashRef.current = 0.2;
        pendingDeathRef.current = { ...frogRef.current };
      } else if (
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
      drawScene();
    },
    [difficulty, drawScene, level, loseLife, reset],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctxRef.current = ctx;
    drawScene();
  }, [drawScene]);

  useGameLoop(step, true);

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
        Score: {score} High: {highScore} Lives: {lives} Level: {level}
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
          onClick={() => setMuted((m) => !m)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Sound: {muted ? 'Off' : 'On'}
        </button>
        <button
          type="button"
          onClick={() => setSlowTime((s) => !s)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Time: {slowTime ? 'Slow' : 'Normal'}
        </button>
        <button
          type="button"
          onClick={() => setShowHitboxes((h) => !h)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Hitboxes: {showHitboxes ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={() => reset(true)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Reset
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
        <label htmlFor="skin">Skin:</label>
        <select
          id="skin"
          className="bg-gray-700"
          value={skin}
          onChange={(e) => setSkin(e.target.value)}
        >
          {Object.keys(SKINS).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
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
};
export { carLaneDefs, logLaneDefs, rampLane } from '../../apps/games/frogger/config';
