import React, { useRef, useEffect, useState, useCallback } from 'react';
import useAssetLoader from '../../hooks/useAssetLoader';

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
// Speeds are expressed in pixels per frame and derived from tile size
// to keep movement consistent with the original game's timing.
const BASE_SPEED = tileSize / 8; // ~1 tile every 8 frames
const PAC_SPEED = BASE_SPEED;
const GHOST_SPEED = BASE_SPEED;
const FRIGHT_GHOST_SPEED = BASE_SPEED * 0.5;
const PATH_LENGTH = 25; // number of positions to keep for ghost traces

const dirs = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const SCATTER_CORNERS = {
  blinky: { x: 13, y: 0 },
  pinky: { x: 0, y: 0 },
  inky: { x: 13, y: 6 },
  clyde: { x: 0, y: 6 },
};

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

const fruitSpawnDots = [10, 30];

const TARGET_MODE_LEVEL = 2; // level index where ghosts begin targeting
const TUNNEL_SPEED = 0.5; // multiplier for speed inside tunnels

const Pacman = () => {
  const { loading, error } = useAssetLoader({
    images: ['/themes/Yaru/status/ubuntu_white_hex.svg'],
    sounds: [],
  });

  const canvasRef = useRef(null);

  // Levels file can override the maze and fruit tile
  const [levels, setLevels] = useState([
    { name: 'Default', maze: defaultMaze, fruit: { x: 7, y: 3 } },
  ]);
  const [levelIndex, setLevelIndex] = useState(0);

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
  const [highScore, setHighScore] = useState(0);
  const [pellets, setPellets] = useState(0);
  const fruitRef = useRef({ active: false, x: 7, y: 3, timer: 0 });
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
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);
  const [announcement, setAnnouncement] = useState('');
  const squashRef = useRef(0);

  const tileAt = (tx, ty) => (mazeRef.current[ty] ? mazeRef.current[ty][tx] : 1);
  const isCenter = (pos) => Math.abs((pos % tileSize) - tileSize / 2) < 0.1;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const isTunnel = useCallback((tx, ty) => {
    const width = mazeRef.current[0].length;
    return (tx === 0 || tx === width - 1) && tileAt(tx, ty) !== 1;
  }, []);

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
      fruitRef.current.x = lvl.fruit.x;
      fruitRef.current.y = lvl.fruit.y;
      fruitRef.current.active = false;
      fruitRef.current.timer = 0;

      pacRef.current.lives = 3;
      pacRef.current.extra = false;

      setScore(0);
      setPellets(0);

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

  const targetFor = (ghost, pac) => {
    if (frightTimerRef.current > 0) return null;
    if (modeSchedule[modeRef.current.index].mode === 'scatter') {
      return SCATTER_CORNERS[ghost.name];
    }
    const px = Math.floor(pac.x / tileSize);
    const py = Math.floor(pac.y / tileSize);
    const pdx = pac.dir.x;
    const pdy = pac.dir.y;
    switch (ghost.name) {
      case 'blinky':
        return { x: px, y: py };
      case 'pinky':
        return { x: px + 4 * pdx, y: py + 4 * pdy };
      case 'inky': {
        const blinky = ghostsRef.current[0];
        const bx = Math.floor(blinky.x / tileSize);
        const by = Math.floor(blinky.y / tileSize);
        const tx = px + 2 * pdx;
        const ty = py + 2 * pdy;
        return { x: tx * 2 - bx, y: ty * 2 - by };
      }
      case 'clyde': {
        const dist = Math.hypot(px - Math.floor(ghost.x / tileSize), py - Math.floor(ghost.y / tileSize));
        if (dist > 8) return { x: px, y: py };
        return SCATTER_CORNERS.clyde;
      }
      default:
        return { x: px, y: py };
    }
  };

    const availableDirs = useCallback((gx, gy, dir) => {
      const rev = { x: -dir.x, y: -dir.y };
      return dirs.filter((d) => {
        if (d.x === rev.x && d.y === rev.y) return false;
        const nx = gx + d.x;
        const ny = gy + d.y;
        return tileAt(nx, ny) !== 1;
      });
    }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maze = mazeRef.current;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 1) {
          ctx.fillStyle = '#2222ff';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (maze[y][x] === 2) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (maze[y][x] === 3) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 6, 0, Math.PI * 2);
          ctx.fill();
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
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(g.x + tileSize / 2 - eyeOffsetX, g.y + tileSize / 2 - eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.arc(g.x + tileSize / 2 + eyeOffsetX, g.y + tileSize / 2 - eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(
        g.x + tileSize / 2 - eyeOffsetX + Math.cos(ang) * pupilOffset,
        g.y + tileSize / 2 - eyeOffsetY + Math.sin(ang) * pupilOffset,
        2,
        0,
        Math.PI * 2
      );
      ctx.arc(
        g.x + tileSize / 2 + eyeOffsetX + Math.cos(ang) * pupilOffset,
        g.y + tileSize / 2 - eyeOffsetY + Math.sin(ang) * pupilOffset,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }, [prefersReduced, isTunnel]);

  const step = useCallback(() => {
    const pac = pacRef.current;
    squashRef.current *= 0.8;
    const maze = mazeRef.current;
    const randomMode = levelIndex < TARGET_MODE_LEVEL;

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
    const pacSpeed = isTunnel(pacTileX, pacTileY) ? PAC_SPEED * TUNNEL_SPEED : PAC_SPEED;

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
        setPellets((p) => p + 1);
      } else {
        setScore((s) => s + 50);
        frightTimerRef.current = 6 * 60;
        // reverse all ghosts when entering frightened mode
        ghostsRef.current.forEach((g) => {
          g.dir = { x: -g.dir.x, y: -g.dir.y };
        });
        setAnnouncement('Pacman energized');
      }
      maze[pty][ptx] = 0;
    }

    // fruit
    if (!fruitRef.current.active && fruitSpawnDots.includes(pellets + 1)) {
      fruitRef.current.active = true;
      fruitRef.current.timer = 9 * 60;
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
      const baseGSpeed = frightTimerRef.current > 0 ? FRIGHT_GHOST_SPEED : GHOST_SPEED;
      const gSpeed = isTunnel(gtxPrev, gtyPrev) ? baseGSpeed * TUNNEL_SPEED : baseGSpeed;

      if (isCenter(g.x) && isCenter(g.y)) {
        let options = availableDirs(Math.floor(gx), Math.floor(gy), g.dir);
        if (frightTimerRef.current > 0 || randomMode) {
          g.dir = options[Math.floor(Math.random() * options.length)] || g.dir;
        } else {
          const target = targetFor(g, pac);
          if (target) {
            options.sort((a, b) => {
              const da = distance({ x: Math.floor(gx) + a.x, y: Math.floor(gy) + a.y }, target);
              const db = distance({ x: Math.floor(gx) + b.x, y: Math.floor(gy) + b.y }, target);
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
          } else {
            resetPositions();
            frightTimerRef.current = 0;
            modeRef.current = { index: 0, timer: modeSchedule[0].duration };
          }
        }
      }
    });
  }, [pellets, score, availableDirs, levelIndex, isTunnel, prefersReduced, setAnnouncement]);

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
          loadLevel(0, data.levels);
        }
      })
      .catch(() => {});
    const stored = window.localStorage.getItem('pacmanHighScore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, [loadLevel]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem('pacmanHighScore', String(score));
    }
  }, [score, highScore]);

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

    let id;
    const loop = () => {
      if (statusRef.current === 'Playing' && !pausedRef.current) {
        stepRef.current();
        // simple gamepad polling
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
      id = requestAnimationFrame(loop);
    };

    draw();
    id = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (id) cancelAnimationFrame(id);
    };
  }, [loading, error, draw, reset, setPaused, setSoundEnabled]);


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

    return (

    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <select
        className="mb-2 text-black"
        value={levelIndex}
        onChange={(e) => loadLevel(Number(e.target.value))}
      >
        {levels.map((lvl, i) => (
          <option key={i} value={i}>
            {lvl.name || `Level ${i + 1}`}
          </option>
        ))}
      </select>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="bg-black"
      />

      <div className="mt-2 px-2 py-1 bg-ub-grey rounded">
        {modeInfo.mode.toUpperCase()} {Math.ceil(modeInfo.timer / 60)}s
      </div>

      <div className="mt-2">Score: {score} | High: {highScore}</div>
      <div className="mt-1">Lives: {pacRef.current.lives}</div>
      {(statusRef.current !== 'Playing' || paused) && (
        <div className="mt-2">{paused ? 'Paused' : statusRef.current}</div>
      )}
      <div className="mt-2 space-x-2">
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
  );
};

export default Pacman;
