import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import useAssetLoader from '../../hooks/useAssetLoader';
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

const TARGET_MODE_LEVEL = 2; // level index where ghosts begin targeting
const TUNNEL_SPEED = 0.5; // multiplier for speed inside tunnels

const DIFFICULTY_PRESETS = {
  Easy: { gameSpeed: 0.9, ghostSpeeds: { scatter: 0.85, chase: 0.8 } },
  Normal: { gameSpeed: 1, ghostSpeeds: { scatter: 1, chase: 1 } },
  Hard: { gameSpeed: 1.1, ghostSpeeds: { scatter: 1.1, chase: 1.2 } },
};

const COMBO_MULTIPLIERS = [1, 2, 4, 8];

const GHOST_COLOR_MAP = {
  blinky: '#ff4d4d',
  pinky: '#ff9ed9',
  inky: '#7bf1ff',
  clyde: '#ffb347',
};

const Pacman = () => {
  const { loading, error } = useAssetLoader({
    images: ['/themes/Yaru/status/ubuntu_white_hex.svg'],
    sounds: [],
  });

  const canvasRef = useRef(null);
  const frameRef = useRef(0);

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
  const [ghostBehavior, setGhostBehavior] = useState(() =>
    ghostsRef.current.map((g) => ({ name: g.name, behavior: 'Waiting', target: null }))
  );
  const ghostBehaviorRef = useRef(ghostBehavior);
  useEffect(() => {
    ghostBehaviorRef.current = ghostBehavior;
  }, [ghostBehavior]);

  const modeRef = useRef({ index: 0, timer: modeSchedule[0].duration });
  const frightTimerRef = useRef(0);
  const [modeInfo, setModeInfo] = useState({
    mode: modeSchedule[0].mode,
    timer: modeSchedule[0].duration,
  });
  const [score, setScore] = useState(0);
  const [pelletCount, setPelletCount] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const fruitRef = useRef({ active: false, x: 7, y: 3, timer: 0 });
  const fruitTimesRef = useRef([]);
  const nextFruitRef = useRef(0);
  const levelTimerRef = useRef(0);
  const statusRef = useRef('Playing');
  const [statusMessage, setStatusMessage] = useState('Playing');
  const updateStatus = useCallback((value) => {
    statusRef.current = value;
    setStatusMessage(value);
  }, []);
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
  const [comboState, setComboState] = useState({ streak: 0, multiplier: 1, active: false, lastBonus: 0 });
  const comboRef = useRef(comboState);
  const updateComboState = useCallback((updates) => {
    comboRef.current = { ...comboRef.current, ...updates };
    setComboState(comboRef.current);
  }, []);
  const resetCombo = useCallback(() => {
    comboRef.current = { streak: 0, multiplier: 1, active: false, lastBonus: 0 };
    setComboState(comboRef.current);
  }, []);
  const [difficulty, setDifficulty] = useState('Normal');
  const [showTutorial, setShowTutorial] = useState(true);
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
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const s = Math.floor(window.innerWidth / WIDTH);
      setScale(s > 1 ? s : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (!preset) return;
    setGhostSpeeds(preset.ghostSpeeds);
    setGameSpeed(preset.gameSpeed);
  }, [difficulty, setGhostSpeeds, setGameSpeed]);

  const tileAt = (tx, ty) => (mazeRef.current[ty] ? mazeRef.current[ty][tx] : 1);
  const isCenter = (pos) => Math.abs((pos % tileSize) - tileSize / 2) < 0.1;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const isTunnel = useCallback((tx, ty) => {
    const width = mazeRef.current[0].length;
    return (tx === 0 || tx === width - 1) && tileAt(tx, ty) !== 1;
  }, []);

  const playSound = useCallback((freq) => {
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
  }, []);

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

      updateStatus('Playing');
      modeRef.current = { index: 0, timer: modeSchedule[0].duration };
      frightTimerRef.current = 0;
      resetCombo();
      setPaused(false);

      resetPositions();
    },
    [levels, resetCombo, updateStatus]
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

    frameRef.current += 1;
    const frame = frameRef.current;
    const glowPulse = prefersReduced ? 0.4 : (Math.sin(frame / 12) + 1) / 2;

    const maze = mazeRef.current;
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const tile = maze[y][x];
        const baseX = x * tileSize;
        const baseY = y * tileSize;
        const centerX = baseX + tileSize / 2;
        const centerY = baseY + tileSize / 2;

        if (tile === 1) {
          ctx.save();
          const gradient = ctx.createLinearGradient(baseX, baseY, baseX + tileSize, baseY + tileSize);
          gradient.addColorStop(0, '#050c2e');
          gradient.addColorStop(1, '#1a35ff');
          ctx.fillStyle = gradient;
          if (!prefersReduced) {
            ctx.shadowColor = `rgba(95,140,255,${0.45 + glowPulse * 0.35})`;
            ctx.shadowBlur = 10 + glowPulse * 10;
          }
          ctx.fillRect(baseX + 1, baseY + 1, tileSize - 2, tileSize - 2);
          if (!prefersReduced) {
            ctx.strokeStyle = `rgba(140,190,255,${0.3 + glowPulse * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(baseX + 1, baseY + 1, tileSize - 2, tileSize - 2);
          }
          ctx.restore();
        } else if (tile === 2) {
          const pelletPulse = prefersReduced ? 0 : (Math.sin((frame + x * 6 + y * 3) / 6) + 1) / 2;
          const radius = 2.2 + pelletPulse * 1.2;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          if (!prefersReduced) {
            ctx.shadowColor = 'rgba(255,255,200,0.85)';
            ctx.shadowBlur = 6 + pelletPulse * 4;
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          if (!prefersReduced) {
            ctx.strokeStyle = `rgba(255,255,255,${0.3 + pelletPulse * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 1.4, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (tile === 3) {
          const energizerPulse = prefersReduced ? 0 : (Math.sin((frame + x * 4 + y * 2) / 5) + 1) / 2;
          const radius = 5.5 + energizerPulse * 1.5;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          if (!prefersReduced) {
            ctx.shadowColor = 'rgba(120,200,255,0.9)';
            ctx.shadowBlur = 14 + energizerPulse * 6;
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          if (!prefersReduced) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(120,200,255,${0.45 + energizerPulse * 0.35})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 4 + energizerPulse * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
          ctx.restore();
        }
      }
    }

    if (fruitRef.current.active) {
      const cx = fruitRef.current.x * tileSize + tileSize / 2;
      const cy = fruitRef.current.y * tileSize + tileSize / 2;
      ctx.save();
      const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, tileSize / 2);
      gradient.addColorStop(0, '#fff6a9');
      gradient.addColorStop(1, '#7dff70');
      ctx.fillStyle = gradient;
      if (!prefersReduced) {
        ctx.shadowColor = 'rgba(140,255,120,0.7)';
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, tileSize / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const pac = pacRef.current;
    const ptx = Math.floor((pac.x + tileSize / 2) / tileSize);
    const pty = Math.floor((pac.y + tileSize / 2) / tileSize);
    if (!prefersReduced && isTunnel(ptx, pty) && (pac.dir.x || pac.dir.y)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      const lineCount = 8;
      for (let i = 0; i < lineCount; i++) {
        const angle = ((frame / 6) + (i * (Math.PI * 2)) / lineCount) % (Math.PI * 2);
        const len = tileSize * 1.5;
        ctx.beginPath();
        ctx.moveTo(pac.x + tileSize / 2, pac.y + tileSize / 2);
        ctx.lineTo(
          pac.x + tileSize / 2 + Math.cos(angle) * len,
          pac.y + tileSize / 2 + Math.sin(angle) * len
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    const angle = Math.atan2(pac.dir.y, pac.dir.x);
    const startAngle = angle + Math.PI / 6;
    const endAngle = angle - Math.PI / 6 + Math.PI * 2;
    const pulse =
      frightTimerRef.current > 0 && !prefersReduced ? 1 + 0.12 * Math.sin(frame / 6) : 1;
    const squash = squashRef.current;
    ctx.save();
    ctx.translate(pac.x + tileSize / 2, pac.y + tileSize / 2);
    if (!prefersReduced) {
      ctx.shadowColor = 'rgba(255,255,0,0.6)';
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = '#ffea00';
    if (pac.dir.x !== 0) ctx.scale(1, 1 - squash);
    else ctx.scale(1 - squash, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, (tileSize / 2 - 2) * pulse, startAngle, endAngle, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ghostsRef.current.forEach((g) => {
      if (g.path && g.path.length > 1 && !prefersReduced) {
        ctx.save();
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        g.path.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      const fillColor =
        frightTimerRef.current > 0 ? '#2b6cff' : GHOST_COLOR_MAP[g.name] || g.color;
      ctx.save();
      if (!prefersReduced) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(g.x + tileSize / 2, g.y + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

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
        updateComboState({ streak: 0, multiplier: 1, active: true, lastBonus: 0 });
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
        resetCombo();
      }
    } else {
      if (comboRef.current.active) {
        resetCombo();
      }
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
    const ghostStatusUpdates = [];
    ghostsRef.current.forEach((g) => {
      const gx = g.x / tileSize;
      const gy = g.y / tileSize;
      const gtxPrev = Math.floor((g.x + tileSize / 2) / tileSize);
      const gtyPrev = Math.floor((g.y + tileSize / 2) / tileSize);
      const scatterMode = modeSchedule[modeRef.current.index].mode === 'scatter';
      let behaviorLabel = 'Chasing';
      let currentTarget = null;
      if (frightTimerRef.current > 0) {
        behaviorLabel = 'Frightened';
      } else if (randomMode) {
        behaviorLabel = 'Roaming';
      } else if (scatterMode) {
        behaviorLabel = 'Scattering';
        currentTarget = SCATTER_CORNERS[g.name];
      }
      const base =
        (frightTimerRef.current > 0
          ? ghostSpeeds.scatter * 0.5
          : modeSchedule[modeRef.current.index].mode === 'scatter'
            ? ghostSpeeds.scatter
            : ghostSpeeds.chase) * gameSpeed;
      const gSpeed = (isTunnel(gtxPrev, gtyPrev) ? TUNNEL_SPEED : 1) * base;

      if (isCenter(g.x) && isCenter(g.y)) {
        let options = availableDirs(Math.floor(gx), Math.floor(gy), g.dir);
        if (frightTimerRef.current > 0 || randomMode) {
          g.dir = options[Math.floor(Math.random() * options.length)] || g.dir;
        } else {
          const target = targetFor(g, pac);
          if (target) {
            currentTarget = target;
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
          const streak = comboRef.current.active ? comboRef.current.streak + 1 : 1;
          const multiplier = COMBO_MULTIPLIERS[Math.min(streak - 1, COMBO_MULTIPLIERS.length - 1)];
          const bonus = 200 * multiplier;
          setScore((s) => s + bonus);
          updateComboState({ active: true, streak, multiplier, lastBonus: bonus });
          playSound(440 + streak * 120);
          g.x = 7 * tileSize;
          g.y = 3 * tileSize;
        } else {
          pac.lives -= 1;
          if (pac.lives <= 0) {
            updateStatus('Game Over');
            submitScore(score);
          } else {
            resetPositions();
            frightTimerRef.current = 0;
            modeRef.current = { index: 0, timer: modeSchedule[0].duration };
            resetCombo();
          }
        }
      }

      ghostStatusUpdates.push({
        name: g.name,
        behavior: behaviorLabel,
        target: currentTarget
          ? { x: Math.round(currentTarget.x), y: Math.round(currentTarget.y) }
          : null,
        speed: Number(gSpeed.toFixed(2)),
      });
    });

    if (ghostStatusUpdates.length) {
      const changed =
        ghostStatusUpdates.length !== ghostBehaviorRef.current.length ||
        ghostStatusUpdates.some((status, idx) => {
          const prev = ghostBehaviorRef.current[idx];
          if (!prev) return true;
          if (prev.behavior !== status.behavior) return true;
          if (prev.speed !== status.speed) return true;
          const prevTarget = prev.target || {};
          const nextTarget = status.target || {};
          return prevTarget.x !== nextTarget.x || prevTarget.y !== nextTarget.y;
        });
      if (changed) {
        ghostBehaviorRef.current = ghostStatusUpdates;
        setGhostBehavior(ghostStatusUpdates);
      }
    }
  }, [
    score,
    availableDirs,
    levelIndex,
    isTunnel,
    prefersReduced,
    setAnnouncement,
    ghostSpeeds,
    gameSpeed,
    submitScore,
    resetCombo,
    updateComboState,
    updateStatus,
    playSound,
    setGhostBehavior,
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

  if (!started) {
    return (
      <div className="flex flex-col items-center">
        <button className="px-2 py-1 bg-ub-grey rounded" onClick={startGame}>
          Start
        </button>
        {leaderboard.length > 0 && (
          <div className="mt-4 text-left">
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
    );
  }

  const activeLevel = filteredLevels[highlight];
  const levelListId = 'pacman-level-options';
  const activeOptionId = activeLevel ? `pacman-level-${activeLevel.index}` : undefined;
  const overlayActive = paused || statusMessage !== 'Playing';
  const overlayLabel = paused ? 'Paused' : statusMessage;
  const statusAccent =
    statusMessage === 'Game Over'
      ? 'text-rose-300'
      : statusMessage === 'Playing'
        ? 'text-emerald-300'
        : 'text-amber-300';
  const comboTone =
    comboState.active
      ? 'border-amber-300/60 bg-amber-400/15 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
      : 'border-white/10 bg-white/5';
  const soundLabel = soundEnabled ? 'Disable sound effects' : 'Enable sound effects';

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
        {showTutorial && (
          <section
            className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-xl backdrop-blur"
            aria-label="How to play Pacman"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-mono text-lg font-semibold uppercase tracking-[0.35em] text-amber-200">
                  Mission Briefing
                </h2>
                <p className="mt-2 text-sm text-white/80">
                  Navigate the neon maze, clear pellets, and trigger energizers to flip the chase. Each frightened ghost boosts your combo multiplier.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-white/70">
                  <li>
                    Use <span className="rounded bg-white/10 px-1 py-0.5">Arrow keys</span>, WASD, or swipe to steer Pacman.
                  </li>
                  <li>
                    Press <span className="rounded bg-white/10 px-1 py-0.5">P</span> to pause, <span className="rounded bg-white/10 px-1 py-0.5">R</span> to reset, and <span className="rounded bg-white/10 px-1 py-0.5">M</span> to toggle audio cues.
                  </li>
                  <li>
                    Adjust difficulty presets or fine-tune speeds for a personalized challenge.
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className="self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Got it
              </button>
            </div>
          </section>
        )}

        <section
          className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-lg backdrop-blur"
          aria-live="polite"
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Score</p>
              <p className="mt-2 text-xl font-semibold text-white">{score.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">High Score</p>
              <p className="mt-2 text-xl font-semibold text-white">{highScore.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Pellets Left</p>
              <p className="mt-2 text-xl font-semibold text-white">{pelletCount}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Level</p>
              <p className="mt-2 text-xl font-semibold text-white">{levelIndex + 1}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Lives</p>
              <p className="mt-2 text-xl font-semibold text-white">{pacRef.current.lives}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`font-mono text-sm uppercase tracking-[0.4em] ${statusAccent}`}>
              {statusMessage}
            </span>
            <span className="text-xs uppercase tracking-[0.4em] text-white/60">
              Mode {modeInfo.mode.toUpperCase()} · {Math.ceil(modeInfo.timer / 60)}s
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
            <div className={`rounded-xl border ${comboTone} p-4 transition`}>
              <h3 className="text-xs uppercase tracking-[0.35em] text-amber-200">Combo Meter</h3>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-black tracking-[0.2em] text-amber-300">
                  x{comboState.multiplier}
                </span>
                <div className="text-right text-xs text-white/70">
                  <div>Streak: {comboState.streak}</div>
                  <div>Last bonus: {comboState.lastBonus.toLocaleString()}</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/60">
                Chain frightened ghosts for exponential points before the energizer fades.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xs uppercase tracking-[0.35em] text-white/60">Ghost Intel</h3>
              <ul className="mt-3 space-y-2 text-sm font-mono">
                {ghostBehavior.map((ghost) => {
                  const tone =
                    ghost.behavior === 'Frightened'
                      ? 'text-sky-300'
                      : ghost.behavior === 'Scattering'
                        ? 'text-amber-200'
                        : ghost.behavior === 'Roaming'
                          ? 'text-purple-200'
                          : 'text-emerald-200';
                  return (
                    <li
                      key={ghost.name}
                      className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: GHOST_COLOR_MAP[ghost.name] || '#ffffff' }}
                        />
                        <span className="tracking-[0.25em]">{ghost.name.toUpperCase()}</span>
                      </span>
                      <span className={`text-xs uppercase tracking-[0.3em] ${tone}`}>
                        {ghost.behavior}
                        {ghost.target ? ` · (${ghost.target.x},${ghost.target.y})` : ''}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                        spd {ghost.speed.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <section
            className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner"
            aria-labelledby="pacman-level-heading"
          >
            <div className="flex items-center justify-between">
              <h2
                id="pacman-level-heading"
                className="font-mono text-xs uppercase tracking-[0.35em] text-white/60"
              >
                Level Select
              </h2>
              <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                {filteredLevels.length} available
              </span>
            </div>
            <label
              htmlFor="pacman-level-search"
              className="mt-3 block text-[11px] uppercase tracking-[0.4em] text-white/50"
            >
              Search
            </label>
            <input
              id="pacman-level-search"
              type="text"
              placeholder="Type to filter levels"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Search Pacman levels"
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
              role="combobox"
              aria-expanded="true"
              aria-controls={levelListId}
              aria-activedescendant={activeOptionId}
            />
            <div
              id={levelListId}
              role="listbox"
              aria-label="Pacman levels"
              className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/10"
            >
              {filteredLevels.length === 0 ? (
                <p className="px-3 py-2 text-sm text-white/70">No levels found</p>
              ) : (
                filteredLevels.map((lvl, i) => {
                  const optionId = `pacman-level-${lvl.index}`;
                  return (
                    <button
                      key={lvl.index}
                      id={optionId}
                      type="button"
                      role="option"
                      aria-selected={i === highlight}
                      aria-label={lvl.name ? `Load ${lvl.name}` : `Load Level ${lvl.index + 1}`}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                        i === highlight
                          ? 'bg-blue-500/80 text-white'
                          : 'text-white/80 hover:bg-white/10 focus-visible:bg-white/10'
                      }`}
                      onMouseEnter={() => setHighlight(i)}
                      onFocus={() => setHighlight(i)}
                      onClick={() => loadLevel(lvl.index)}
                    >
                      <span>{lvl.name || `Level ${lvl.index + 1}`}</span>
                      <span className="text-xs text-white/50">#{lvl.index + 1}</span>
                    </button>
                  );
                })
              )}
            </div>
            <label
              htmlFor="pacman-difficulty"
              className="mt-4 block text-[11px] uppercase tracking-[0.4em] text-white/50"
            >
              Difficulty
            </label>
            <select
              id="pacman-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {Object.keys(DIFFICULTY_PRESETS).map((key) => (
                <option key={key} value={key} className="text-black">
                  {key}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-white/50">
              Presets adjust Pacman and ghost speeds. Combine them with advanced controls for a bespoke run.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-inner">
            <h2 className="font-mono text-xs uppercase tracking-[0.35em] text-white/60">
              Advanced Speed Controls
            </h2>
            <p className="mt-2 text-[11px] text-white/50">
              Fine-tune ghost scatter/chase speeds and the global tempo to craft your preferred difficulty curve.
            </p>
            <div className="mt-3 rounded-xl border border-white/5 bg-black/30 p-3">
              <SpeedControls
                ghostSpeeds={ghostSpeeds}
                setGhostSpeeds={setGhostSpeeds}
                gameSpeed={gameSpeed}
                setGameSpeed={setGameSpeed}
              />
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-black/50 p-4 shadow-xl">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black"
            style={{ width: WIDTH * scale, height: HEIGHT * scale }}
          >
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="h-full w-full"
              role="img"
              aria-label="Pacman maze gameplay canvas"
              style={{ width: WIDTH * scale, height: HEIGHT * scale, imageRendering: 'pixelated' }}
            />
            {overlayActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm text-center">
                <div className="space-y-2 px-4">
                  <p className="font-mono text-lg uppercase tracking-[0.4em] text-white">{overlayLabel}</p>
                  <p className="text-sm text-white/70">
                    Press P to toggle pause, R to reset, or adjust speeds to recalibrate the chase.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60">
            <span>Controls: Arrow keys / WASD / Swipe</span>
            <span>Gamepad supported</span>
            <span>Press P to pause</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.3em] transition hover:border-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              onClick={reset}
              aria-label="Reset current level"
            >
              Reset
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.3em] transition hover:border-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? 'Resume game' : 'Pause game'}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.3em] transition hover:border-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              onClick={() => setSoundEnabled((s) => !s)}
              aria-pressed={soundEnabled}
              aria-label={soundLabel}
            >
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </button>
          </div>
        </section>

        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>
    </div>
  );
};

export default Pacman;
