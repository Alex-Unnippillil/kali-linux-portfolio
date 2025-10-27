import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import useAssetLoader from '../../hooks/useAssetLoader';
import useCanvasResize from '../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useGameLoop } from './Games/common';
import GameLayout from './GameLayout';
import { usePacmanHighScore } from '../../games/pacman/highScore';
import {
  computeGhostTarget,
  getAvailableDirections,
  isTunnelTile,
  tileAt as getTileValue,
} from '../../games/pacman/logic';
import SpeedControls from '../../games/pacman/components/SpeedControls';

/**
 * Small Pacman implementation used inside the portfolio. The goal of this
 * rewrite is not to be a perfect clone but to provide a reasonable approximation
 * that demonstrates a faithful ghost AI, buffered turns, and different inputs.
 */

// 0: empty, 1: wall, 2: pellet, 3: energizer
const defaultMaze = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
  [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
  [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const tileSize = 20;
const WIDTH = defaultMaze[0].length * tileSize;
const HEIGHT = defaultMaze.length * tileSize;
const speed = 1; // pacman speed in pixels per frame
const PATH_LENGTH = 25; // number of positions to keep for ghost traces
const FRUIT_DURATION = 9 * 60; // fruit stays for this many frames

const modeSchedule = [
  { mode: 'scatter', duration: 7 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 7 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 5 * 60 },
  { mode: 'chase', duration: 20 * 60 },
  { mode: 'scatter', duration: 5 * 60 },
  { mode: 'chase', duration: Infinity },
];

const TARGET_MODE_LEVEL = 2; // level index where ghosts begin targeting
const TUNNEL_SPEED = 0.5; // multiplier for speed inside tunnels

const Pacman = () => {
  const { loading, error } = useAssetLoader({
    images: ['/themes/Yaru/status/ubuntu_white_hex.svg'],
    sounds: [],
  });

  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const ctxRef = useRef(null);

  // Levels file can override the maze, fruit tile and fruit timings
  const [levels, setLevels] = useState([
    { name: 'Default', maze: defaultMaze, fruit: { x: 7, y: 3 }, fruitTimes: [10, 30] },
  ]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [ghostSpeeds, setGhostSpeeds] = useState({ scatter: 1, chase: 1 });
  const [gameSpeed, setGameSpeed] = useState(1);
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(0);
  const filteredLevels = useMemo(
    () => {
      const q = search.toLowerCase();
      return levels
        .map((lvl, i) => ({ ...lvl, index: i }))
        .filter(({ name, index }) => {
          const label = name || `Level ${index + 1}`;
          return label.toLowerCase().includes(q);
        });
    },
    [levels, search]
  );

  const mazeRef = useRef(defaultMaze.map((row) => row.slice()));

  const pacRef = useRef({
    x: tileSize, // pixel coords
    y: tileSize,
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    lives: 3,
    extra: false,
  });

  const ghostsRef = useRef([
    { name: 'blinky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'red', path: [] },
    { name: 'pinky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'pink', path: [] },
    { name: 'inky', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'cyan', path: [] },
    { name: 'clyde', x: 7 * tileSize, y: 3 * tileSize, dir: { x: 0, y: -1 }, color: 'orange', path: [] },
  ]);

  const modeRef = useRef({ index: 0, timer: modeSchedule[0].duration });
  const frightTimerRef = useRef(0);
  const [modeInfo, setModeInfo] = useState({
    mode: modeSchedule[0].mode,
    timer: modeSchedule[0].duration,
  });
  const [score, setScore] = useState(0);
  const [pelletCount, setPelletCount] = useState(0);
  const { highScore, recordScore } = usePacmanHighScore();
  const [started, setStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const fruitRef = useRef({ active: false, x: 7, y: 3, timer: 0 });
  const fruitTimesRef = useRef([]);
  const nextFruitRef = useRef(0);
  const levelTimerRef = useRef(0);
  const statusRef = useRef('Playing');
  const audioCtxRef = useRef(null);
  const touchStartRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);
  const prefersReduced = usePrefersReducedMotion();
  const [announcement, setAnnouncement] = useState('');
  const squashRef = useRef(0);

  const tileAt = (tx, ty) => getTileValue(mazeRef.current, tx, ty);
  const isCenter = (pos) => Math.abs((pos % tileSize) - tileSize / 2) < 0.1;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const isTunnel = useCallback((tx, ty) => isTunnelTile(mazeRef.current, tx, ty), []);

  const playSound = (freq) => {
    if (!soundRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore audio errors
    }
  };

  const resetPositions = () => {
    const pac = pacRef.current;
    pac.x = tileSize;
    pac.y = tileSize;
    pac.dir = { x: 0, y: 0 };
    pac.nextDir = { x: 0, y: 0 };
    ghostsRef.current.forEach((g) => {
      g.x = 7 * tileSize;
      g.y = 3 * tileSize;
      g.dir = { x: 0, y: -1 };
      g.path = [];
    });
  };

  const loadLevel = useCallback(
    (idx, lvls = levels) => {
      const lvl = lvls[idx];
      setLevelIndex(idx);
      mazeRef.current = lvl.maze.map((r) => r.slice());
      const pellets = lvl.maze.flat().filter((t) => t === 2 || t === 3).length;
      setPelletCount(pellets);
      fruitRef.current.x = lvl.fruit.x;
      fruitRef.current.y = lvl.fruit.y;
      fruitRef.current.active = false;
      fruitRef.current.timer = 0;
      fruitTimesRef.current = (lvl.fruitTimes || []).map((t) => t * 60);
      nextFruitRef.current = 0;
      levelTimerRef.current = 0;

      pacRef.current.lives = 3;
      pacRef.current.extra = false;

      setScore(0);

      statusRef.current = 'Playing';
      modeRef.current = { index: 0, timer: modeSchedule[0].duration };
      frightTimerRef.current = 0;
      setPaused(false);

      resetPositions();
    },
    [levels]
  );

  const reset = useCallback(() => {
    loadLevel(levelIndex);
  }, [loadLevel, levelIndex]);

  const startGame = () => {
    setStarted(true);
    reset();
  };

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') return;
    const load = async () => {
      try {
        const res = await fetch('/api/pacman/leaderboard');
        const data = await res.json();
        setLeaderboard(data);
      } catch {
        setLeaderboard([]);
      }
    };
    void load();
  }, []);

  const submitScore = useCallback(
    async (finalScore) => {
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') return;
      try {
        const name = window.prompt('Enter your name', 'Player');
        if (!name) return;
        const res = await fetch('/api/pacman/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score: finalScore }),
        });
        const data = await res.json();
        setLeaderboard(data);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ctxRef.current || canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const maze = mazeRef.current;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) {
          ctx.fillStyle = '#2222ff';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (maze[y][x] === 2) {
          ctx.save();
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'white';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (maze[y][x] === 3) {
          ctx.save();
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'white';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    if (fruitRef.current.active) {
      ctx.fillStyle = 'green';
      ctx.fillRect(
        fruitRef.current.x * tileSize + 4,
        fruitRef.current.y * tileSize + 4,
        tileSize - 8,
        tileSize - 8
      );
    }

    const pac = pacRef.current;
    const ptx = Math.floor((pac.x + tileSize / 2) / tileSize);
    const pty = Math.floor((pac.y + tileSize / 2) / tileSize);
    if (!prefersReduced && isTunnel(ptx, pty) && (pac.dir.x || pac.dir.y)) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      const lineCount = 10;
      for (let i = 0; i < lineCount; i++) {
        const angle = (Date.now() / 50 + (i * (Math.PI * 2)) / lineCount) % (Math.PI * 2);
        const len = tileSize;
        ctx.beginPath();
        ctx.moveTo(pac.x + tileSize / 2, pac.y + tileSize / 2);
        ctx.lineTo(
          pac.x + tileSize / 2 + Math.cos(angle) * len,
          pac.y + tileSize / 2 + Math.sin(angle) * len
        );
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'yellow';
    const angle = Math.atan2(pac.dir.y, pac.dir.x);
    const startAngle = angle + Math.PI / 6;
    const endAngle = angle - Math.PI / 6 + Math.PI * 2;
    const pulse =
      frightTimerRef.current > 0 && !prefersReduced
        ? 1 + 0.1 * Math.sin(Date.now() / 100)
        : 1;
    const squash = squashRef.current;
    ctx.save();
    ctx.translate(pac.x + tileSize / 2, pac.y + tileSize / 2);
    if (pac.dir.x !== 0) ctx.scale(1, 1 - squash);
    else ctx.scale(1 - squash, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, (tileSize / 2 - 2) * pulse, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ghostsRef.current.forEach((g) => {
      if (g.path && g.path.length > 1) {
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        g.path.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = frightTimerRef.current > 0 ? 'blue' : g.color;
      ctx.beginPath();
      ctx.arc(g.x + tileSize / 2, g.y + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // eyes
      const eyeOffsetX = 5;
      const eyeOffsetY = 5;
      const pupilOffset = 2;
      const dx = pac.x - g.x;
      const dy = pac.y - g.y;
      const ang = Math.atan2(dy, dx);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'white';
      [
        { ox: -eyeOffsetX, oy: -eyeOffsetY },
        { ox: eyeOffsetX, oy: -eyeOffsetY },
      ].forEach(({ ox, oy }) => {
        ctx.beginPath();
        ctx.arc(g.x + tileSize / 2 + ox, g.y + tileSize / 2 + oy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillStyle = 'black';
      [
        { ox: -eyeOffsetX, oy: -eyeOffsetY },
        { ox: eyeOffsetX, oy: -eyeOffsetY },
      ].forEach(({ ox, oy }) => {
        ctx.beginPath();
        ctx.arc(
          g.x + tileSize / 2 + ox + Math.cos(ang) * pupilOffset,
          g.y + tileSize / 2 + oy + Math.sin(ang) * pupilOffset,
          2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    });
  }, [prefersReduced, isTunnel]);

  const step = useCallback(() => {
    const pac = pacRef.current;
    squashRef.current *= 0.8;
    const maze = mazeRef.current;
    const randomMode = levelIndex < TARGET_MODE_LEVEL;
    levelTimerRef.current++;

    // handle pacman turning
    const px = pac.x / tileSize;
    const py = pac.y / tileSize;
    if (pac.nextDir.x || pac.nextDir.y) {
      const nx = Math.floor(px + pac.nextDir.x * 0.5);
      const ny = Math.floor(py + pac.nextDir.y * 0.5);
      if (tileAt(nx, ny) !== 1 && isCenter(pac.x) && isCenter(pac.y)) {
        pac.dir = pac.nextDir;
        pac.nextDir = { x: 0, y: 0 };
      }
    }

    const pacTileX = Math.floor((pac.x + tileSize / 2) / tileSize);
    const pacTileY = Math.floor((pac.y + tileSize / 2) / tileSize);
    const pacSpeed =
      (isTunnel(pacTileX, pacTileY) ? speed * TUNNEL_SPEED : speed) * gameSpeed;

    // move pacman
    const tx = Math.floor((pac.x + pac.dir.x * pacSpeed + tileSize / 2) / tileSize);
    const ty = Math.floor((pac.y + pac.dir.y * pacSpeed + tileSize / 2) / tileSize);
    if (tileAt(tx, ty) !== 1) {
      pac.x += pac.dir.x * pacSpeed;
      pac.y += pac.dir.y * pacSpeed;
    } else {
      pac.dir = { x: 0, y: 0 };
    }

    const ptx = Math.floor((pac.x + tileSize / 2) / tileSize);
    const pty = Math.floor((pac.y + tileSize / 2) / tileSize);

    // pellets and energizers
    if (maze[pty][ptx] === 2 || maze[pty][ptx] === 3) {
      squashRef.current = 0.3;
      if (maze[pty][ptx] === 2) {
        setScore((s) => s + 10);
      } else {
        setScore((s) => s + 50);
        frightTimerRef.current = 6 * 60;
        setAnnouncement('Pacman energized');
      }
      setPelletCount((c) => c - 1);
      maze[pty][ptx] = 0;
    }

    // fruit
    if (
      !fruitRef.current.active &&
      nextFruitRef.current < fruitTimesRef.current.length &&
      levelTimerRef.current === fruitTimesRef.current[nextFruitRef.current]
    ) {
      fruitRef.current.active = true;
      fruitRef.current.timer = FRUIT_DURATION;
      nextFruitRef.current += 1;
      playSound(440);
    }
    if (fruitRef.current.active) {
      fruitRef.current.timer--;
      if (ptx === fruitRef.current.x && pty === fruitRef.current.y) {
        setScore((s) => s + 100);
        fruitRef.current.active = false;
        playSound(880);
      } else if (fruitRef.current.timer <= 0) {
        fruitRef.current.active = false;
      }
    }

    // extra life
    if (!pac.extra && score >= 10000) {
      pac.extra = true;
      pac.lives += 1;
    }

    // mode switching
    if (frightTimerRef.current > 0) {
      frightTimerRef.current--;
      if (frightTimerRef.current === 0) {
        setAnnouncement('Pacman is normal');
      }
    } else {
      modeRef.current.timer--;
      if (modeRef.current.timer <= 0 && modeRef.current.index < modeSchedule.length - 1) {
        modeRef.current.index += 1;
        modeRef.current.timer = modeSchedule[modeRef.current.index].duration;
      }
    }
    setModeInfo({
      mode:
        frightTimerRef.current > 0
          ? 'fright'
          : modeSchedule[modeRef.current.index].mode,
      timer: frightTimerRef.current > 0 ? frightTimerRef.current : modeRef.current.timer,
    });

    // move ghosts
    ghostsRef.current.forEach((g) => {
      const gx = g.x / tileSize;
      const gy = g.y / tileSize;
      const gtxPrev = Math.floor((g.x + tileSize / 2) / tileSize);
      const gtyPrev = Math.floor((g.y + tileSize / 2) / tileSize);
      const base =
        (frightTimerRef.current > 0
          ? ghostSpeeds.scatter * 0.5
          : modeSchedule[modeRef.current.index].mode === 'scatter'
            ? ghostSpeeds.scatter
            : ghostSpeeds.chase) * gameSpeed;
      const gSpeed = (isTunnel(gtxPrev, gtyPrev) ? TUNNEL_SPEED : 1) * base;

      if (isCenter(g.x) && isCenter(g.y)) {
        const tilePos = { x: Math.floor(gx), y: Math.floor(gy) };
        let options = getAvailableDirections(maze, {
          position: tilePos,
          direction: g.dir,
        });
        const frightened = frightTimerRef.current > 0;
        if (frightened || randomMode) {
          g.dir = options[Math.floor(Math.random() * options.length)] || g.dir;
        } else {
          const target = computeGhostTarget(g, pac, ghostsRef.current, {
            tileSize,
            mode: modeSchedule[modeRef.current.index].mode,
            frightened,
          });
          if (target) {
            options.sort((a, b) => {
              const da = distance({ x: tilePos.x + a.x, y: tilePos.y + a.y }, target);
              const db = distance({ x: tilePos.x + b.x, y: tilePos.y + b.y }, target);
              return da - db;
            });
          }
          g.dir = options[0] || g.dir;
        }
      }

      const ntx = Math.floor((g.x + g.dir.x * gSpeed + tileSize / 2) / tileSize);
      const nty = Math.floor((g.y + g.dir.y * gSpeed + tileSize / 2) / tileSize);
      if (tileAt(ntx, nty) !== 1) {
        g.x += g.dir.x * gSpeed;
        g.y += g.dir.y * gSpeed;
        if (!prefersReduced) {
          g.path.push({ x: g.x + tileSize / 2, y: g.y + tileSize / 2 });
          if (g.path.length > PATH_LENGTH) g.path.shift();
        } else {
          g.path = [];
        }
      }

      const gtx = Math.floor((g.x + tileSize / 2) / tileSize);
      const gty = Math.floor((g.y + tileSize / 2) / tileSize);

      if (gtx === ptx && gty === pty) {
        if (frightTimerRef.current > 0) {
          setScore((s) => s + 200);
          g.x = 7 * tileSize;
          g.y = 3 * tileSize;
        } else {
          pac.lives -= 1;
          if (pac.lives <= 0) {
            statusRef.current = 'Game Over';
            submitScore(score);
          } else {
            resetPositions();
            frightTimerRef.current = 0;
            modeRef.current = { index: 0, timer: modeSchedule[0].duration };
          }
        }
      }
    });
  }, [
    score,
    levelIndex,
    isTunnel,
    prefersReduced,
    setAnnouncement,
    ghostSpeeds,
    gameSpeed,
    submitScore,
    getAvailableDirections,
    computeGhostTarget,
  ]);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    fetch('/pacman-levels.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.levels) {
          setLevels(data.levels);
          setSearch('');
          setHighlight(0);
          loadLevel(0, data.levels);
        }
      })
      .catch(() => {});
  }, [loadLevel]);

  useEffect(() => {
    recordScore(score);
  }, [recordScore, score]);

  useEffect(() => {
    if (loading || error) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          pacRef.current.nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          pacRef.current.nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          pacRef.current.nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          pacRef.current.nextDir = { x: 1, y: 0 };
          break;
        case 'p':
        case 'P':
          setPaused((p) => !p);
          break;
        case 'r':
        case 'R':
          reset();
          break;
        case 'm':
        case 'M':
          setSoundEnabled((s) => !s);
          break;
        default:
          break;
      }
    };

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        pacRef.current.nextDir = { x: dx > 0 ? 1 : -1, y: 0 };
      } else {
        pacRef.current.nextDir = { x: 0, y: dy > 0 ? 1 : -1 };
      }
      touchStartRef.current = null;
    };

    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);

    draw();

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [loading, error, draw, reset, setPaused, setSoundEnabled, started]);

  const loopTick = useCallback(() => {
    if (statusRef.current === 'Playing' && !pausedRef.current) {
      stepRef.current();
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (pads) {
        for (const pad of pads) {
          if (!pad) continue;
          const [ax, ay] = pad.axes;
          if (Math.abs(ax) > 0.3) pacRef.current.nextDir = { x: ax > 0 ? 1 : -1, y: 0 };
          if (Math.abs(ay) > 0.3) pacRef.current.nextDir = { x: 0, y: ay > 0 ? 1 : -1 };
        }
      }
    }
    draw();
  }, [draw]);

  useGameLoop(loopTick, started && !loading && !error);

  useEffect(() => {
    if (!started) return;
    draw();
  }, [draw, paused, started]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        Failed to load assets.
      </div>
    );
  }

  if (!started) {
    return (
      <GameLayout gameId="pacman" score={score} highScore={highScore}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ub-cool-grey p-4 text-white">
          <button className="px-3 py-1 rounded bg-ub-grey" onClick={startGame}>
            Start
          </button>
          {leaderboard.length > 0 && (
            <div className="text-left">
              <h3 className="font-bold">Top Scores</h3>
              <ol className="ml-4 list-decimal">
                {leaderboard.map((entry, i) => (
                  <li key={`${entry.name}-${i}`}>
                    {entry.name}: {entry.score}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout gameId="pacman" score={score} highScore={highScore}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ub-cool-grey p-4 text-white">
      <div className="mb-2 w-full max-w-xs">
        <input
          type="text"
          placeholder="Search level..."
          className="w-full px-2 py-1 text-black"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, filteredLevels.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              const sel = filteredLevels[highlight];
              if (sel) loadLevel(sel.index);
            }
          }}
        />
        <ul className="max-h-40 overflow-y-auto bg-white text-black border border-gray-300">
          {filteredLevels.length === 0 && (
            <li className="px-2 py-1">No levels found</li>
          )}
          {filteredLevels.map((lvl, i) => (
            <li
              key={lvl.index}
              className={`${i === highlight ? 'bg-blue-500 text-white' : ''} px-2 py-1 cursor-pointer`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => loadLevel(lvl.index)}
            >
              {lvl.name || `Level ${lvl.index + 1}`}
            </li>
          ))}
        </ul>
      </div>

      <SpeedControls
        ghostSpeeds={ghostSpeeds}
        setGhostSpeeds={setGhostSpeeds}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
      />

      <div
        className="relative w-full max-w-md"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full bg-black"
          style={{ imageRendering: 'pixelated' }}
          aria-label="Pacman board"
        />
        <div className="absolute top-0 left-0 w-full text-xs bg-black bg-opacity-75 px-1 flex justify-between">
          <span>Score: {score}</span>
          <span>Pellets: {pelletCount}</span>
          <span>Lvl: {levelIndex + 1}</span>
          <span>P: pause</span>
        </div>
      </div>

      <div className="mt-2 px-2 py-1 bg-ub-grey rounded">
        {modeInfo.mode.toUpperCase()} {Math.ceil(modeInfo.timer / 60)}s
      </div>

      <div className="mt-2 flex gap-4 text-sm">
        <span>High: {highScore}</span>
        <span>Lives: {pacRef.current.lives}</span>
      </div>
      {(statusRef.current !== 'Playing' || paused) && (
        <div className="mt-2 text-sm">{paused ? 'Paused' : statusRef.current}</div>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          className="px-2 py-1 bg-ub-grey rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-2 py-1 bg-ub-grey rounded"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-2 py-1 bg-ub-grey rounded"
          onClick={() => setSoundEnabled((s) => !s)}
        >
          {soundEnabled ? 'Sound On' : 'Sound Off'}
        </button>
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
      </div>
    </GameLayout>
  );
};

export default Pacman;
