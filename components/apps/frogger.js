import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logEvent } from '../../utils/analytics';
import { vibrate } from './Games/common/haptics';
import {
  generateLaneConfig,
  SKINS,
  SKIN_GROUPS,
  getRandomSkin,
} from '../../apps/games/frogger/config';
import { getLevelConfig } from '../../apps/games/frogger/levels';

const WIDTH = 7;
const HEIGHT = 8;
const SUB_STEP = 0.5;
const CELL = 32;
const RIPPLE_DURATION = 0.5;
const FROG_HOP_DURATION = 0.18;
const TIME_PER_DIFF = {
  easy: 72,
  normal: 60,
  hard: 50,
};
const MIN_LEVEL_TIME = 25;
const DEFAULT_COLOR_MODE = 'vibrant';

const getLevelTime = (diff, lvl) =>
  Math.max(MIN_LEVEL_TIME, TIME_PER_DIFF[diff] - (lvl - 1) * 2);

const PAD_POSITIONS = [1, 3, 5];
const DIFFICULTY_MULTIPLIERS = {
  easy: 0.8,
  normal: 1,
  hard: 1.2,
};

const smoothStep = (t) => t * t * (3 - 2 * t);
const withAlpha = (hex, alpha) => {
  const raw = hex.replace('#', '');
  const bigint = parseInt(raw, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
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

const Frogger = () => {
  const initialTime = getLevelTime('normal', 1);
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
  const [colorMode, setColorMode] = useState(DEFAULT_COLOR_MODE);
  const [skin, setSkin] = useState(() => getRandomSkin(DEFAULT_COLOR_MODE));
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [goals, setGoals] = useState(0);
  const deathStreakRef = useRef(0);
  const safeFlashRef = useRef(0);
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const statusRef = useRef(status);
  const hitFlashRef = useRef(0);
  const pendingDeathRef = useRef(null);
  const gradientCacheRef = useRef({});
  const frogAnimationRef = useRef({
    start: { ...initialFrog },
    end: { ...initialFrog },
    progress: 1,
  });
  const lightingRef = useRef(0);
  const timeRef = useRef(initialTime);
  const lastTimerBroadcastRef = useRef(initialTime);


  useEffect(() => { frogRef.current = frog; }, [frog]);
  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => {
    setGoals(pads.filter(Boolean).length);
  }, [pads]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { reduceMotionRef.current = reduceMotion; }, [reduceMotion]);
  useEffect(() => { slowTimeRef.current = slowTime; }, [slowTime]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { timeRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { lastTimerBroadcastRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { gradientCacheRef.current = {}; }, [skin]);
  useEffect(() => {
    const available = SKIN_GROUPS[colorMode];
    if (available && !available.includes(skin)) {
      setSkin(available[0]);
    }
  }, [colorMode, skin]);

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

  const syncTimer = useCallback(
    (diff, lvl) => {
      const nextTime = getLevelTime(diff, lvl);
      timeRef.current = nextTime;
      lastTimerBroadcastRef.current = nextTime;
      setTimeLeft(nextTime);
    },
    [setTimeLeft],
  );

  const alignFrogToStart = useCallback(() => {
    frogRef.current = { ...initialFrog };
    frogAnimationRef.current = {
      start: { ...initialFrog },
      end: { ...initialFrog },
      progress: 1,
    };
  }, []);

  const moveFrog = useCallback((dx, dy) => {
    if (pausedRef.current) return;
    setFrog((prev) => {
      const x = prev.x + dx;
      const y = prev.y + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return prev;
      const next = { x, y };
      if (!reduceMotionRef.current) {
        frogAnimationRef.current = {
          start: { ...prev },
          end: next,
          progress: 0,
        };
      } else {
        frogAnimationRef.current = {
          start: next,
          end: next,
          progress: 1,
        };
      }
      vibrate(50);
      if (dy === -1) setScore((s) => s + 10);
      playTone(440, 0.05);
      return next;
    });
  }, [setScore]);

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
    logEvent({ category: 'Frogger', action: 'level_start', value: 1 });
  }, []);

  const reset = useCallback(
    (full = false, diff = difficulty, lvl = level) => {
      alignFrogToStart();
      setFrog(initialFrog);
      const mult = DIFFICULTY_MULTIPLIERS[diff];
      const base = getLevelConfig(lvl);
      const lanes = generateLaneConfig(lvl, mult, base);
      setCars(lanes.cars.map((l, i) => initLane(l, i + 1)));
      setLogs(lanes.logs.map((l, i) => initLane(l, i + 101)));
      setStatus('');
      const targetLevel = full ? 1 : lvl;
      syncTimer(diff, targetLevel);
      if (full) {
        setScore(0);
        setLives(3);
        setPads(PAD_POSITIONS.map(() => false));
        setLevel(1);
        setGoals(0);
        setSkin(getRandomSkin(colorMode));
        nextLife.current = 500;
        deathStreakRef.current = 0;
        logEvent({
          category: 'Frogger',
          action: 'level_start',
          value: 1,
        });
      }
    },
    [alignFrogToStart, colorMode, difficulty, level, syncTimer]
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
      logEvent({ category: 'Frogger', action: 'death', value: level });
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
      const colors = SKINS[skin];
      const widthPx = canvas.width;
      const heightPx = canvas.height;
      ctx.clearRect(0, 0, widthPx, heightPx);
      const phase = rippleRef.current;
      const lightingPhase = lightingRef.current;
      const sparkle = (Math.sin(lightingPhase) + 1) / 2;
      const gradientCache = gradientCacheRef.current;
      const ensureGradient = (key, factory) => {
        if (!gradientCache[key]) gradientCache[key] = factory();
        return gradientCache[key];
      };

      const waterBase = colors.water || '#0f172a';
      const waterHighlight = colors.waterHighlight || waterBase;
      const waterShadow = colors.waterShadow || waterBase;
      const rippleColor = colors.ripple || waterHighlight;
      const grassBase = colors.grass || '#14532d';
      const grassHighlight = colors.grassHighlight || grassBase;
      const padBase = colors.pad || grassHighlight;
      const padHighlight = colors.padHighlight || grassHighlight;
      const padShadow = colors.padShadow || grassBase;
      const laneStripe = colors.laneStripe || '#cbd5f5';
      const laneEdge = colors.laneEdge || '#0b1120';
      const roadDark = colors.roadDark || '#111827';
      const roadLight = colors.roadLight || roadDark;
      const hudAccent = colors.hudAccent || colors.frog || '#facc15';

      ctx.fillStyle = roadDark;
      ctx.fillRect(0, 0, widthPx, heightPx);
      const ambient = ensureGradient('ambient', () => {
        const grad = ctx.createLinearGradient(0, 0, 0, heightPx);
        grad.addColorStop(0, withAlpha(waterHighlight, 0.35));
        grad.addColorStop(1, withAlpha(roadDark, 0.9));
        return grad;
      });
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, widthPx, heightPx);

      for (let y = 0; y < HEIGHT; y += 1) {
        const top = y * CELL;
        if (y === 3 || y === 6) {
          const gradient = ensureGradient(`grass-${y}`, () => {
            const grad = ctx.createLinearGradient(0, top, 0, top + CELL);
            grad.addColorStop(0, grassHighlight);
            grad.addColorStop(1, grassBase);
            return grad;
          });
          ctx.fillStyle = gradient;
          ctx.fillRect(0, top, widthPx, CELL);
          ctx.fillStyle = withAlpha(hudAccent, 0.08 + safeFlashRef.current * 0.1);
          ctx.fillRect(0, top, widthPx, 3);
          ctx.fillRect(0, top + CELL - 3, widthPx, 3);
          if (safeFlashRef.current > 0 && Math.floor(phase * 8) % 2 === 0) {
            ctx.fillStyle = withAlpha(hudAccent, 0.25);
            ctx.fillRect(0, top, widthPx, CELL);
          }
        } else if (y >= 4 && y <= 5) {
          const gradient = ensureGradient(`road-${y}`, () => {
            const grad = ctx.createLinearGradient(0, top, 0, top + CELL);
            grad.addColorStop(0, roadLight);
            grad.addColorStop(0.6, roadDark);
            grad.addColorStop(1, laneEdge);
            return grad;
          });
          ctx.fillStyle = gradient;
          ctx.fillRect(0, top, widthPx, CELL);
          ctx.fillStyle = withAlpha(laneStripe, 0.55 + sparkle * 0.25);
          ctx.fillRect(0, top + CELL / 2 - 1, widthPx, 2);
          ctx.fillStyle = withAlpha(laneEdge, 0.35);
          ctx.fillRect(0, top, widthPx, 2);
          ctx.fillRect(0, top + CELL - 2, widthPx, 2);
        } else {
          const gradient = ensureGradient(`water-${y}`, () => {
            const grad = ctx.createLinearGradient(0, top, 0, top + CELL);
            grad.addColorStop(0, waterHighlight);
            grad.addColorStop(0.5, waterBase);
            grad.addColorStop(1, waterShadow);
            return grad;
          });
          ctx.fillStyle = gradient;
          ctx.fillRect(0, top, widthPx, CELL);
          if (!reduceMotionRef.current) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = rippleColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x <= WIDTH; x += 1) {
              const px = x * CELL;
              const wave = Math.sin(phase * 1.6 + x * 0.9 + y * 0.6) * 3;
              const py = top + CELL * 0.5 + wave;
              if (x === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.fillStyle = withAlpha(rippleColor, 0.2);
            ctx.fillRect(0, top + CELL * 0.45, widthPx, 2);
          }
        }
      }

      PAD_POSITIONS.forEach((padX, idx) => {
        const padActive = padsRef.current[idx];
        const baseX = padX * CELL;
        const bob = reduceMotionRef.current ? 0 : Math.sin(phase * 1.4 + padX) * 2;
        ctx.save();
        ctx.translate(baseX + CELL / 2, CELL / 2 + bob);
        const padGradient = ctx.createRadialGradient(0, 0, CELL * 0.1, 0, 0, CELL * 0.45);
        padGradient.addColorStop(0, padActive ? colors.frogLight || colors.frog : padHighlight);
        padGradient.addColorStop(1, padActive ? colors.frogShadow || colors.frog : padShadow);
        ctx.fillStyle = padGradient;
        ctx.beginPath();
        ctx.arc(0, 0, CELL * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = withAlpha(padShadow, 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, CELL * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        if (padActive) {
          ctx.fillStyle = withAlpha(hudAccent, 0.6 + sparkle * 0.2);
          ctx.beginPath();
          ctx.arc(0, 0, CELL * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      logsRef.current.forEach((lane) => {
        lane.entities.forEach((e) => {
          const x = e.x * CELL;
          const y = lane.y * CELL;
          const width = lane.length * CELL;
          const logLight = colors.logLight || colors.log;
          const logShadow = colors.logShadow || colors.log;
          const gradient = ctx.createLinearGradient(x, y, x, y + CELL);
          gradient.addColorStop(0, logLight);
          gradient.addColorStop(0.7, colors.log);
          gradient.addColorStop(1, logShadow);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, width, CELL);
          ctx.fillStyle = withAlpha(logShadow, 0.35);
          ctx.fillRect(x, y + CELL * 0.3, width, 2);
          ctx.fillRect(x, y + CELL * 0.7, width, 2);
          const reflectionTop = y + CELL;
          if (reflectionTop < heightPx) {
            const reflectionGradient = ctx.createLinearGradient(
              x,
              reflectionTop,
              x,
              reflectionTop + CELL * 0.9,
            );
            reflectionGradient.addColorStop(0, withAlpha(logLight, 0.25));
            reflectionGradient.addColorStop(1, 'rgba(0,0,0,0)');
            const offset = reduceMotionRef.current
              ? 0
              : Math.sin(phase * 1.2 + e.x * 0.8) * 2;
            ctx.save();
            ctx.translate(0, offset);
            ctx.fillStyle = reflectionGradient;
            ctx.fillRect(x, reflectionTop, width, CELL * 0.9);
            ctx.restore();
          }
        });
      });

      carsRef.current.forEach((lane) => {
        lane.entities.forEach((e) => {
          const x = e.x * CELL;
          const y = lane.y * CELL;
          const width = lane.length * CELL;
          const carLight = colors.carLight || colors.car;
          const carShadow = colors.carShadow || colors.car;
          const gradient = ctx.createLinearGradient(x, y, x, y + CELL);
          gradient.addColorStop(0, carLight);
          gradient.addColorStop(0.6, colors.car);
          gradient.addColorStop(1, carShadow);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, width, CELL);
          ctx.fillStyle = withAlpha(colors.carAccent || carLight, 0.35 + sparkle * 0.2);
          ctx.fillRect(x + 4, y + CELL * 0.25, width - 8, 3);
          ctx.save();
          const lightLength = CELL * 0.6;
          ctx.globalAlpha = 0.3 + sparkle * 0.2;
          ctx.fillStyle = withAlpha(colors.carAccent || carLight, 1);
          if (lane.dir === 1) {
            ctx.fillRect(x + width - 2, y + CELL * 0.35, lightLength, 4);
          } else {
            ctx.fillRect(x - lightLength + 2, y + CELL * 0.35, lightLength, 4);
          }
          ctx.restore();
        });
      });

      splashesRef.current.forEach((sp) => {
        const progress = sp.t / RIPPLE_DURATION;
        const radius = progress * CELL;
        ctx.strokeStyle = withAlpha(rippleColor, 1 - progress);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      const anim = frogAnimationRef.current;
      let frogX = frogRef.current.x;
      let frogY = frogRef.current.y;
      if (anim.progress < 1) {
        const t = smoothStep(anim.progress);
        frogX = anim.start.x + (anim.end.x - anim.start.x) * t;
        frogY = anim.start.y + (anim.end.y - anim.start.y) * t;
      }
      const hopHeight =
        anim.progress < 1 && !reduceMotionRef.current
          ? Math.sin(anim.progress * Math.PI) * CELL * 0.35
          : 0;
      const frogPixelX = frogX * CELL + CELL / 2;
      const frogPixelY = frogY * CELL + CELL / 2;
      const isOnWater = frogY <= 2 || frogY === 7 || frogY === 0;
      if (!isOnWater) {
        ctx.save();
        ctx.globalAlpha = 0.35 * (1 - hopHeight / (CELL * 0.35 || 1));
        ctx.fillStyle = withAlpha(colors.frogShadow || colors.frog, 1);
        ctx.beginPath();
        ctx.ellipse(
          frogPixelX,
          frogPixelY + CELL * 0.25,
          CELL * 0.28,
          CELL * 0.14,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(frogPixelX, frogPixelY - hopHeight);
      const tilt = anim.progress < 1 ? (anim.end.x - anim.start.x) * 0.25 : 0;
      ctx.rotate(tilt);
      const frogGradient = ctx.createLinearGradient(0, -CELL * 0.35, 0, CELL * 0.35);
      frogGradient.addColorStop(0, colors.frogLight || colors.frog);
      frogGradient.addColorStop(1, colors.frogShadow || colors.frog);
      ctx.fillStyle = frogGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, CELL * 0.32, CELL * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.frogOutline || withAlpha(colors.frog, 0.8);
      ctx.beginPath();
      ctx.arc(-CELL * 0.12, -CELL * 0.12, CELL * 0.1, 0, Math.PI * 2);
      ctx.arc(CELL * 0.12, -CELL * 0.12, CELL * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-CELL * 0.12, -CELL * 0.12, CELL * 0.055, 0, Math.PI * 2);
      ctx.arc(CELL * 0.12, -CELL * 0.12, CELL * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-CELL * 0.12, -CELL * 0.12, CELL * 0.025, 0, Math.PI * 2);
      ctx.arc(CELL * 0.12, -CELL * 0.12, CELL * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (showHitboxes) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        logsRef.current.forEach((lane) => {
          lane.entities.forEach((e) => {
            ctx.strokeRect(e.x * CELL, lane.y * CELL, lane.length * CELL, CELL);
          });
        });
        carsRef.current.forEach((lane) => {
          lane.entities.forEach((e) => {
            ctx.strokeRect(e.x * CELL, lane.y * CELL, lane.length * CELL, CELL);
          });
        });
        ctx.strokeRect(frogRef.current.x * CELL, frogRef.current.y * CELL, CELL, CELL);
      }

      if (hitFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255,255,255,${hitFlashRef.current / 0.2})`;
        ctx.fillRect(0, 0, widthPx, heightPx);
      }

      if (pausedRef.current || statusRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, widthPx, heightPx);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          pausedRef.current ? 'Paused' : statusRef.current,
          widthPx / 2,
          heightPx / 2,
        );
      }

      if (timeRef.current <= 10 && !pausedRef.current) {
        const urgency = Math.min(0.45, (10 - timeRef.current) / 20);
        ctx.fillStyle = withAlpha('#f87171', urgency);
        ctx.fillRect(0, 0, widthPx, heightPx);
      }
    };
    const loop = (time) => {
      const rawDt = (time - last) / 1000;
      last = time;
      const dt = rawDt * (slowTimeRef.current ? 0.7 : 1);
      const rippleSpeed = reduceMotionRef.current ? 1.6 : 4;
      rippleRef.current += dt * rippleSpeed;
      lightingRef.current = (lightingRef.current + dt * 0.6) % (Math.PI * 2);
      if (frogAnimationRef.current.progress < 1) {
        const hopDuration = reduceMotionRef.current
          ? FROG_HOP_DURATION * 0.6
          : FROG_HOP_DURATION;
        frogAnimationRef.current.progress = Math.min(
          1,
          frogAnimationRef.current.progress + dt / hopDuration,
        );
      }
      if (!pausedRef.current) {
        const nextTime = Math.max(0, timeRef.current - dt);
        if (nextTime !== timeRef.current) {
          timeRef.current = nextTime;
          if (Math.floor(nextTime) !== Math.floor(lastTimerBroadcastRef.current)) {
            lastTimerBroadcastRef.current = nextTime;
            setTimeLeft(nextTime);
          }
        }
        if (nextTime <= 0 && !pendingDeathRef.current && livesRef.current > 0) {
          hitFlashRef.current = 0.2;
          pendingDeathRef.current = { ...frogRef.current };
        }
      }
      if (safeFlashRef.current > 0) safeFlashRef.current -= dt;
      if (hitFlashRef.current > 0) hitFlashRef.current -= dt;
      splashesRef.current = splashesRef.current
        .map((s) => ({ ...s, t: s.t + dt }))
        .filter((s) => s.t < RIPPLE_DURATION);
      if (pendingDeathRef.current) {
        if (hitFlashRef.current <= 0) {
          loseLife(pendingDeathRef.current);
          alignFrogToStart();
          pendingDeathRef.current = null;
        }
        draw();
        raf = requestAnimationFrame(loop);
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
        alignFrogToStart();
      } else {
        const padResult = handlePads(frogRef.current, padsRef.current);
        padsRef.current = padResult.pads;
        if (padResult.dead) {
          loseLife(frogRef.current);
          alignFrogToStart();
        } else if (padResult.levelComplete) {
          setStatus('Level Complete!');
          setScore((s) => s + 100);
          playTone(880, 0.2);
          logEvent({
            category: 'Frogger',
            action: 'level_complete',
            value: level,
          });
          const newLevel = level + 1;
          setLevel(newLevel);
          logEvent({
            category: 'Frogger',
            action: 'level_start',
            value: newLevel,
          });
          setPads(PAD_POSITIONS.map(() => false));
          reset(false, difficulty, newLevel);
          deathStreakRef.current = 0;
          alignFrogToStart();
        } else if (padResult.padHit) {
          setScore((s) => s + 100);
          setPads([...padsRef.current]);
          playTone(660, 0.1);
          deathStreakRef.current = 0;
          alignFrogToStart();
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
  }, [alignFrogToStart, difficulty, level, loseLife, reset, skin, showHitboxes]);

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

  const activeColors = SKINS[skin];
  const hudBg = activeColors.hudBg || 'rgba(15,23,42,0.85)';
  const hudText = activeColors.hudText || '#e2e8f0';
  const accentColor = activeColors.hudAccent || '#38bdf8';
  const labelColor = 'rgba(226,232,240,0.75)';
  const timerMax = getLevelTime(difficulty, level);
  const liveTime = timeRef.current;
  const timerSeconds = Math.max(0, Math.ceil(timeLeft));
  const timerColor = timerSeconds <= 10 ? '#fca5a5' : hudText;
  const timerProgress = timerMax ? Math.max(0, Math.min(1, liveTime / timerMax)) : 0;
  const availableSkinList =
    SKIN_GROUPS[colorMode] && SKIN_GROUPS[colorMode].length
      ? SKIN_GROUPS[colorMode]
      : Object.keys(SKINS);
  const displayDifficulty = `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
  const displaySkin = `${skin.charAt(0).toUpperCase()}${skin.slice(1)}`;
  const buttonClasses =
    'px-3 py-1.5 rounded-lg border border-slate-600/60 bg-slate-800/70 text-sm font-medium shadow hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 focus:ring-offset-slate-900 transition-colors';
  const selectClasses =
    'px-3 py-1.5 rounded-lg border border-slate-600/60 bg-slate-900/70 text-sm shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 focus:ring-offset-slate-900';

  const primaryStats = [
    { label: 'Lives', value: lives, color: hudText },
    {
      label: 'Goals',
      value: `${goals}/${PAD_POSITIONS.length}`,
      color: goals === PAD_POSITIONS.length ? accentColor : hudText,
    },
    { label: 'Timer', value: `${timerSeconds}s`, color: timerColor, progress: timerProgress },
    { label: 'Level', value: level, color: hudText },
  ];
  const secondaryStats = [
    { label: 'Score', value: score, color: hudText },
    { label: 'High Score', value: highScore, color: hudText },
    { label: 'Difficulty', value: displayDifficulty, color: accentColor },
    { label: 'Skin', value: displaySkin, color: accentColor },
  ];

  return (
    <div id="frogger-container" className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center gap-5 px-4 py-6">
        <div className="w-full">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-black/50 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={WIDTH * CELL}
              height={HEIGHT * CELL}
              className="block h-full w-full"
              role="img"
              aria-label="Frogger playfield"
              style={{ width: '100%', height: 'auto' }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/40" />
          </div>
        </div>

        <div className="w-full space-y-3 text-sm">
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-slate-700/60 p-3 shadow-lg backdrop-blur"
            style={{ background: hudBg }}
          >
            {primaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-600/40 bg-black/30 px-3 py-2 text-center shadow-sm"
              >
                <p className="text-[0.65rem] uppercase tracking-wide" style={{ color: labelColor }}>
                  {stat.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                {stat.label === 'Timer' && (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-700/60" aria-hidden="true">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: accentColor,
                        width: `${Math.max(5, Math.min(100, stat.progress * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-slate-700/60 p-3 shadow-lg backdrop-blur"
            style={{ background: hudBg }}
          >
            {secondaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-600/40 bg-black/30 px-3 py-2 text-center shadow-sm"
              >
                <p className="text-[0.65rem] uppercase tracking-wide" style={{ color: labelColor }}>
                  {stat.label}
                </p>
                <p className="text-lg font-semibold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="w-full rounded-2xl border border-slate-700/60 p-4 shadow-lg backdrop-blur"
          style={{ background: hudBg, color: hudText }}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setPaused((p) => !p)} className={buttonClasses}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={() => setSound((s) => !s)} className={buttonClasses}>
              Sound: {sound ? 'On' : 'Off'}
            </button>
            <button type="button" onClick={() => setSlowTime((s) => !s)} className={buttonClasses}>
              Time: {slowTime ? 'Slow' : 'Normal'}
            </button>
            <button type="button" onClick={() => setShowHitboxes((h) => !h)} className={buttonClasses}>
              Hitboxes: {showHitboxes ? 'On' : 'Off'}
            </button>
            <label
              htmlFor="frogger-difficulty"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Difficulty</span>
              <select
                id="frogger-difficulty"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
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
            </label>
            <label
              htmlFor="frogger-color-mode"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Palette Mode</span>
              <select
                id="frogger-color-mode"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
                value={colorMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setColorMode(mode);
                }}
              >
                <option value="vibrant">Vibrant</option>
                <option value="accessible">Accessible</option>
              </select>
            </label>
            <label
              htmlFor="frogger-skin"
              className="flex flex-col text-left text-xs uppercase tracking-wide"
              style={{ color: labelColor }}
            >
              <span>Palette</span>
              <select
                id="frogger-skin"
                className={`${selectClasses} mt-1`}
                style={{ color: hudText }}
                value={skin}
                onChange={(e) => setSkin(e.target.value)}
              >
                {availableSkinList.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          className="w-full rounded-2xl border border-slate-700/60 px-4 py-3 text-center text-sm shadow-lg backdrop-blur"
          role="status"
          aria-live="polite"
          style={{ background: hudBg, color: hudText }}
        >
          {status || 'Hop across the river and claim each glowing pad!'}
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:hidden">
          {mobileControls.map((c, i) =>
            c ? (
              <button
                key={i}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-900"
                style={{ color: hudText }}
                onTouchStart={() => startHold(c.dx, c.dy)}
                onTouchEnd={endHold}
                onMouseDown={() => startHold(c.dx, c.dy)}
                onMouseUp={endHold}
                onMouseLeave={endHold}
              >
                {c.label}
              </button>
            ) : (
              <div key={i} className="h-14 w-14" />
            ),
          )}
        </div>
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
