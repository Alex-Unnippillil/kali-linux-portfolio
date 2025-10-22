import React, { useEffect, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import usePersistedState from '../../hooks/usePersistedState';
import calculate3BV from '../../games/minesweeper/metrics';
import { serializeBoard, deserializeBoard } from '../../games/minesweeper/save';
import { getDailySeed } from '../../utils/dailySeed';

/**
 * Classic Minesweeper implementation.
 * The grid logic is powered by a seeded board generator
 * and renders to a canvas element.
 */

const BASE_CELL_SIZE = 32;
const DIFFICULTIES = {
  beginner: { label: 'Beginner', size: 8, mines: 10 },
  intermediate: { label: 'Intermediate', size: 16, mines: 40 },
  expert: { label: 'Expert', size: 22, mines: 99 },
};

const numberColors = [
  '#0000ff',
  '#008000',
  '#ff0000',
  '#000080',
  '#800000',
  '#008080',
  '#000000',
  '#808080',
];

// simple seeded pseudo random generator
const mulberry32 = (a) => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// convert string seed to 32-bit number
const hashSeed = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
};

const cloneBoard = (board) =>
  board.map((row) => row.map((cell) => ({ ...cell })));

const generateBoard = (size, minesCount, seed, sx, sy) => {
  const board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      question: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from({ length: size * size }, (_, i) => i);

  // Fisher-Yates shuffle using seeded rng
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = new Set();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safe.add(nx * size + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= minesCount) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / size);
    const y = idx % size;
    board[x][y].mine = true;
    placed++;
  }

  const dirs = [-1, 0, 1];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < size &&
            ny >= 0 &&
            ny < size &&
            board[nx][ny].mine
          ) {
            count++;
          }
        }),
      );
      board[x][y].adjacent = count;
    }
  }
  return board;
};


const checkWin = (board) =>
  board.flat().every((cell) => cell.revealed || cell.mine);

const parseCssColor = (value) => {
  if (!value) return { r: 0, g: 0, b: 0 };
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const expanded =
      hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const num = Number.parseInt(expanded, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1]
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((n) => !Number.isNaN(n));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
  }
  return { r: 0, g: 0, b: 0 };
};

const mixRgb = (a, b, weight) => ({
  r: Math.round(a.r * (1 - weight) + b.r * weight),
  g: Math.round(a.g * (1 - weight) + b.g * weight),
  b: Math.round(a.b * (1 - weight) + b.b * weight),
});

const toRgbaString = (rgb, alpha = 1) =>
  `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

const lightenColor = (value, amount) =>
  toRgbaString(mixRgb(parseCssColor(value), { r: 255, g: 255, b: 255 }, amount));

const darkenColor = (value, amount) =>
  toRgbaString(mixRgb(parseCssColor(value), { r: 0, g: 0, b: 0 }, amount));

const calculateRiskMap = (board) => {
  if (!board) return null;
  const size = board.length;
  const risk = Array.from({ length: size }, () => Array(size).fill(0));
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;
      let maxProb = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          const nCell = board[nx][ny];
          if (!nCell.revealed || nCell.mine || nCell.adjacent === 0) continue;
          let flagged = 0;
          let hidden = 0;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              if (ox === 0 && oy === 0) continue;
              const mx = nx + ox;
              const my = ny + oy;
              if (
                mx < 0 ||
                mx >= size ||
                my < 0 ||
                my >= size
              )
                continue;
              const around = board[mx][my];
              if (around.flagged) flagged++;
              if (!around.revealed && !around.flagged) hidden++;
            }
          }
          const remaining = nCell.adjacent - flagged;
          if (remaining > 0 && hidden > 0) {
            const prob = remaining / hidden;
            if (prob > maxProb) maxProb = prob;
          }
        }
      }
      risk[x][y] = maxProb;
    }
  }
  return risk;
};

const Minesweeper = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const initWorker = () => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./minesweeper.worker.js', import.meta.url),
      );
    } else {
      workerRef.current = null;
    }
  };
  const [difficulty, setDifficulty] = useState('beginner');
  const [config, setConfig] = useState(DIFFICULTIES.beginner);
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('ready');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [shareCode, setShareCode] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTimes, setBestTimes] = useState({});
  const [bv, setBV] = useState(0);
  const [bvps, setBVPS] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [flags, setFlags] = useState(0);
  const [scoreboard, setScoreboard] = useState({
    beginner: [],
    intermediate: [],
    expert: [],
  });
  const [lastWin, setLastWin] = useState(null);
  const [paused, setPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState(0);
  const [sound, setSound] = useState(true);
  const [ariaMessage, setAriaMessage] = useState('');
  const prefersReducedMotion = useRef(false);
  const themeRef = useRef({
    surface: '#1f2937',
    surfaceMuted: '#111827',
    surfaceRaised: '#27303f',
    accent: '#0f94d2',
    border: '#0b1621',
    text: '#f5faff',
  });
  const particlesRef = useRef([]);
  const lastFrameRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const [showRisk, setShowRisk] = usePersistedState(
    'minesweeperAssist',
    false,
  );
  const [useQuestionMarks, setUseQuestionMarks] = usePersistedState(
    'minesweeperQuestion',
    false,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [facePressed, setFacePressed] = useState(false);
  const [faceBtnDown, setFaceBtnDown] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const effectiveSize = board ? board.length : config.size;
  const canvasSize = effectiveSize * BASE_CELL_SIZE;
  const remainingMines = Math.max(config.mines - flags, 0);
  const currentBest = bestTimes[difficulty] ?? null;
  const leaderboard = scoreboard[difficulty] || [];
  const timeDisplay = elapsed.toFixed(2);
  const bvpsDisplay = bvps !== null ? bvps.toFixed(2) : '--';
  const bestDisplay = currentBest !== null ? currentBest.toFixed(2) : '--';
  const leftDown = useRef(false);
  const rightDown = useRef(false);
  const chorded = useRef(false);
  const flagAnim = useRef({});

  useEffect(() => {
    initWorker();
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('minesweeper-scoreboard');
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = {
          beginner: [],
          intermediate: [],
          expert: [],
          ...parsed,
        };
        Object.keys(merged).forEach((key) => {
          merged[key] = (merged[key] || [])
            .map((entry) => ({
              ...entry,
              time: typeof entry.time === 'number' ? entry.time : Number(entry.time) || 0,
              date: entry.date || Date.now(),
            }))
            .filter((entry) => entry.time > 0)
            .sort((a, b) => a.time - b.time)
            .slice(0, 5);
        });
        setScoreboard(merged);
        setBestTimes({
          beginner: merged.beginner.length ? merged.beginner[0].time : null,
          intermediate: merged.intermediate.length ? merged.intermediate[0].time : null,
          expert: merged.expert.length ? merged.expert[0].time : null,
        });
      } else {
        const legacy = localStorage.getItem('minesweeper-best-time');
        if (legacy) {
          const timeValue = parseFloat(legacy);
          if (!Number.isNaN(timeValue)) {
            const converted = {
              beginner: [
                { time: timeValue, date: Date.now(), label: 'Legacy Personal Best' },
              ],
              intermediate: [],
              expert: [],
            };
            localStorage.setItem(
              'minesweeper-scoreboard',
              JSON.stringify(converted),
            );
            setScoreboard(converted);
            setBestTimes({ beginner: timeValue, intermediate: null, expert: null });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load Minesweeper scoreboard', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const pullTheme = () => {
      const styles = getComputedStyle(root);
      themeRef.current = {
        surface:
          styles.getPropertyValue('--color-surface').trim() || themeRef.current.surface,
        surfaceMuted:
          styles.getPropertyValue('--color-surface-muted').trim() || themeRef.current.surfaceMuted,
        surfaceRaised:
          styles.getPropertyValue('--color-surface-raised').trim() || themeRef.current.surfaceRaised,
        accent:
          styles.getPropertyValue('--color-accent').trim() || themeRef.current.accent,
        border:
          styles.getPropertyValue('--color-border').trim() || themeRef.current.border,
        text:
          styles.getPropertyValue('--color-text').trim() || themeRef.current.text,
      };
    };
    pullTheme();
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(pullTheme);
      observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('minesweeper-state');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.config) {
            setConfig(data.config);
            const matched = Object.entries(DIFFICULTIES).find(
              ([, value]) =>
                value.size === data.config.size && value.mines === data.config.mines,
            );
            if (matched) setDifficulty(matched[0]);
          } else if (data.difficulty && DIFFICULTIES[data.difficulty]) {
            setConfig(DIFFICULTIES[data.difficulty]);
            setDifficulty(data.difficulty);
          }
          if (data.board) {
            const first = data.board[0]?.[0];
            const hydrated = Array.isArray(first)
              ? deserializeBoard(data.board)
              : data.board;
            setBoard(hydrated);
            setHasSave(true);
            if (!data.config) {
              const inferredSize = hydrated.length;
              const inferred = Object.entries(DIFFICULTIES).find(
                ([, value]) => value.size === inferredSize,
              );
              if (inferred) {
                setDifficulty(inferred[0]);
                setConfig(DIFFICULTIES[inferred[0]]);
              } else {
                setConfig((prev) => ({ ...prev, size: inferredSize }));
              }
            }
          } else {
            setHasSave(false);
          }
          if (data.status) setStatus(data.status);
          if (data.seed !== undefined) setSeed(data.seed);
          if (data.shareCode) setShareCode(data.shareCode);
          if (data.bv) setBV(data.bv);
          if (data.bvps !== undefined) setBVPS(data.bvps);
          if (data.flags) setFlags(data.flags);
          if (data.paused) setPaused(data.paused);
          if (data.status === 'playing' && !data.paused) {
            setStartTime(Date.now() - (data.elapsed || 0) * 1000);
            setElapsed(data.elapsed || 0);
          } else {
            if (data.startTime) setStartTime(data.startTime);
            if (data.elapsed) setElapsed(data.elapsed);
          }
        } catch {
          setHasSave(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');
    if (urlSeed) {
      const num = parseInt(urlSeed, 36);
      if (!Number.isNaN(num)) {
        setSeed(num);
        return;
      }
    }
    const saved = localStorage.getItem('minesweeper-state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.seed !== undefined) {
          setSeed(data.seed);
          return;
        }
      } catch {}
    }
    getDailySeed('minesweeper').then((s) => setSeed(hashSeed(s)));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('seed', seed.toString(36));
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [seed]);

  useEffect(() => {
    if (status === 'playing' && !paused) {
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, startTime, paused]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.current = media.matches;
      const handler = (e) => (prefersReducedMotion.current = e.matches);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${canvasSize}px`;
    canvas.style.height = 'auto';

    const defaultCell = {
      revealed: false,
      flagged: false,
      question: false,
      adjacent: 0,
      mine: false,
    };

    const renderFrame = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const delta = Math.min((now - lastFrameRef.current) / 1000, 0.08);
      lastFrameRef.current = now;

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      const { surface, surfaceMuted, surfaceRaised, accent, border, text } =
        themeRef.current;
      const cellSize = canvasSize / effectiveSize;
      ctx.font = `${Math.max(12, cellSize * 0.6)}px 'Ubuntu Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const riskMap = showRisk ? calculateRiskMap(board) : null;

      for (let x = 0; x < effectiveSize; x++) {
        for (let y = 0; y < effectiveSize; y++) {
          const cell = board ? board[x][y] : defaultCell;
          const px = y * cellSize;
          const py = x * cellSize;
          const isCursor =
            cursorVisible && cursor.x === x && cursor.y === y && !cell.revealed;
          const isPressed = isCursor && (leftDown.current || rightDown.current);
          const gradient = ctx.createLinearGradient(px, py, px, py + cellSize);
          if (cell.revealed) {
            gradient.addColorStop(
              0,
              lightenColor(surfaceRaised || surfaceMuted || surface, 0.15),
            );
            gradient.addColorStop(
              1,
              darkenColor(surfaceRaised || surfaceMuted || surface, 0.12),
            );
          } else {
            const base = isCursor ? surfaceRaised : surface;
            gradient.addColorStop(
              0,
              isPressed ? darkenColor(base, 0.28) : lightenColor(base, 0.1),
            );
            gradient.addColorStop(
              1,
              isPressed ? darkenColor(base, 0.38) : darkenColor(base, 0.2),
            );
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = darkenColor(border || surface, cell.revealed ? 0.2 : 0.4);
          ctx.lineWidth = Math.max(1, cellSize * 0.05);
          ctx.strokeRect(px, py, cellSize, cellSize);

          if (!cell.revealed && isCursor) {
            ctx.save();
            ctx.fillStyle = toRgbaString(parseCssColor(accent), 0.14);
            ctx.fillRect(px, py, cellSize, cellSize);
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, cellSize * 0.08);
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.restore();
          }

          const key = `${x},${y}`;
          if (cell.revealed) {
            if (cell.mine) {
              ctx.fillText('💣', px + cellSize / 2, py + cellSize / 2);
            } else if (cell.adjacent > 0) {
              ctx.fillStyle = numberColors[cell.adjacent - 1] || text;
              ctx.fillText(cell.adjacent, px + cellSize / 2, py + cellSize / 2);
            }
          } else {
            const anim = flagAnim.current[key];
            if (cell.flagged || anim) {
              let scale = 1;
              if (anim) {
                const t = Math.min((Date.now() - anim.start) / 220, 1);
                scale = anim.dir > 0 ? t : 1 - t;
                if (t >= 1) delete flagAnim.current[key];
              }
              if (cell.flagged || scale > 0) {
                ctx.save();
                ctx.translate(px + cellSize / 2, py + cellSize / 2);
                ctx.scale(scale, scale);
                ctx.fillText('🚩', 0, 0);
                ctx.restore();
              }
            } else if (cell.question) {
              ctx.fillStyle = text;
              ctx.fillText('?', px + cellSize / 2, py + cellSize / 2);
            } else if (riskMap) {
              const r = riskMap[x][y];
              if (r > 0) {
                ctx.fillStyle = toRgbaString(
                  { r: 248, g: 113, b: 113 },
                  Math.min(0.45, r * 0.5),
                );
                ctx.fillRect(px, py, cellSize, cellSize);
              }
            }
          }
        }
      }

      particlesRef.current = particlesRef.current.filter((particle) => {
        const nextLife = particle.life - delta;
        if (nextLife <= 0) return false;
        particle.life = nextLife;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += particle.gravity * delta;
        const alpha = Math.max(particle.life / (particle.maxLife || 0.001), 0);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      if (paused && status === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.fillStyle = text;
        ctx.font = `${Math.max(16, cellSize)}px 'Ubuntu Mono', monospace`;
        ctx.fillText('Paused', canvasSize / 2, canvasSize / 2);
      }

      frame = requestAnimationFrame(renderFrame);
    };

    let frame = requestAnimationFrame(renderFrame);
    const handleResize = () => {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.maxWidth = `${canvasSize}px`;
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      cancelAnimationFrame(frame);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [board, status, paused, showRisk, cursor, cursorVisible, canvasSize, effectiveSize]);

  useEffect(() => {
    if (!useQuestionMarks && board) {
      const newBoard = cloneBoard(board);
      let changed = false;
      const size = newBoard.length;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          if (newBoard[x][y].question) {
            newBoard[x][y].question = false;
            changed = true;
          }
        }
      }
      if (changed) setBoard(newBoard);
    }
  }, [useQuestionMarks, board]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          board: board ? serializeBoard(board) : null,
          status,
          seed,
          shareCode,
          startTime,
          elapsed,
          bv,
          bvps,
          flags,
          paused,
          difficulty,
          config,
        };
        localStorage.setItem('minesweeper-state', JSON.stringify(data));
        setHasSave(!!board);
      } catch {}
    }
  }, [board, status, seed, shareCode, startTime, elapsed, bv, bvps, flags, paused, difficulty, config]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('minesweeper-scoreboard', JSON.stringify(scoreboard));
    } catch (err) {
      console.error('Failed to persist Minesweeper scoreboard', err);
    }
  }, [scoreboard]);

  const playSound = (type) => {
    if (!sound || typeof window === 'undefined') return;
    if (!audioRef.current)
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value =
      type === 'boom' ? 120 : type === 'flag' ? 330 : 440;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const spawnParticles = (x, y, count, palette, velocityRange = 110) => {
    if (prefersReducedMotion.current) return;
    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = velocityRange * (0.4 + Math.random() * 0.6);
      const lifetime = 0.55 + Math.random() * 0.35;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: lifetime,
        maxLife: lifetime,
        size: 1.8 + Math.random() * 1.8,
        color: palette[Math.floor(Math.random() * palette.length)],
        gravity: 260,
      };
    });
    particlesRef.current = [...particlesRef.current, ...particles];
  };

  const spawnExplosion = (x, y) => {
    const cx = (y + 0.5) * BASE_CELL_SIZE;
    const cy = (x + 0.5) * BASE_CELL_SIZE;
    spawnParticles(cx, cy, 24, ['#f87171', '#facc15', '#f97316'], 160);
  };

  const spawnFlagBurst = (x, y) => {
    const cx = (y + 0.5) * BASE_CELL_SIZE;
    const cy = (x + 0.5) * BASE_CELL_SIZE;
    spawnParticles(cx, cy, 14, [themeRef.current.accent, '#ffffff'], 90);
  };

  const checkAndHandleWin = (newBoard) => {
    if (!checkWin(newBoard)) return;
    setStatus('won');
    const time = (Date.now() - startTime) / 1000;
    setElapsed(time);
    const finalBV = calculate3BV(newBoard);
    setBV(finalBV);
    setBVPS(time > 0 ? finalBV / time : finalBV);
    const entry = {
      time,
      date: Date.now(),
      seed: shareCode || seed.toString(36),
      bv: finalBV,
      difficulty,
    };
    setScoreboard((prev) => {
      const updated = {
        beginner: prev.beginner || [],
        intermediate: prev.intermediate || [],
        expert: prev.expert || [],
      };
      const bucket = [...(updated[difficulty] || []), entry]
        .sort((a, b) => a.time - b.time)
        .slice(0, 5);
      updated[difficulty] = bucket;
      setBestTimes((times) => ({
        ...times,
        [difficulty]: bucket.length ? bucket[0].time : null,
      }));
      return updated;
    });
    setLastWin(entry);
  };

  const computeRevealed = (board, starts) => {
    if (workerRef.current) {
      return new Promise((resolve) => {
        workerRef.current.onmessage = (e) => resolve(e.data);
        workerRef.current.postMessage({ board, cells: starts });
      });
    }
    const size = board.length;
    const visited = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );
    const queue = [];
    starts.forEach(([sx, sy]) => {
      if (sx >= 0 && sx < size && sy >= 0 && sy < size && !visited[sx][sy]) {
        visited[sx][sy] = true;
        queue.push([sx, sy]);
      }
    });
    const cells = [];
    let hit = false;
    while (queue.length) {
      const [x, y] = queue.shift();
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;
      cells.push([x, y]);
      if (cell.mine) {
        hit = true;
        continue;
      }
      if (cell.adjacent === 0) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < size &&
              ny >= 0 &&
              ny < size &&
              !visited[nx][ny]
            ) {
              visited[nx][ny] = true;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    return Promise.resolve({ cells, hit });
  };

  const revealWave = async (newBoard, sx, sy, onComplete) => {
    const { cells } = await computeRevealed(newBoard, [[sx, sy]]);
    const animate = (order) => {
      let idx = 0;
      const step = () => {
        let processed = 0;
        const limit = 8;
        while (idx < order.length && processed < limit) {
          const [x, y] = order[idx++];
          const cell = newBoard[x][y];
          if (cell.revealed || cell.flagged) continue;
          cell.revealed = true;
          processed++;
        }
        setBoard(cloneBoard(newBoard));
        if (idx < order.length) {
          requestAnimationFrame(step);
        } else {
          onComplete?.(order.length);
        }
      };
      requestAnimationFrame(step);
    };

    animate(cells);
  };

  const startGame = async (x, y) => {
    flagAnim.current = {};
    const newBoard = generateBoard(config.size, config.mines, seed, x, y);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setShareCode(`${seed.toString(36)}-${x}-${y}`);
    setBV(calculate3BV(newBoard));
    setBVPS(null);
    setFlags(0);
    setPaused(false);
    const finalize = (count) => {
      setAriaMessage(`Revealed ${count} cells`);
      checkAndHandleWin(newBoard);
    };
    if (prefersReducedMotion.current) {
      const { cells } = await computeRevealed(newBoard, [[x, y]]);
      cells.forEach(([cx, cy]) => {
        newBoard[cx][cy].revealed = true;
      });
      setBoard(cloneBoard(newBoard));
      finalize(cells.length);
    } else {
      revealWave(newBoard, x, y, finalize);
    }
  };

  const handleClick = async (x, y) => {
    if (status === 'lost' || status === 'won' || paused) return;
    if (!board) {
      await startGame(x, y);
      playSound('reveal');
      return;
    }

    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];

    if (cell.revealed) {
      if (cell.adjacent > 0) {
        let flagged = 0;
        for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < newBoard.length &&
            ny >= 0 &&
            ny < newBoard.length &&
            newBoard[nx][ny].flagged
          ) {
            flagged++;
          }
        }
        }
        if (flagged === cell.adjacent) {
          for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < newBoard.length &&
              ny >= 0 &&
              ny < newBoard.length &&
              !newBoard[nx][ny].flagged
            ) {
              const { hit, cells: revealed } = await computeRevealed(
                newBoard,
                [[nx, ny]],
                );
                revealed.forEach(([cx, cy]) => {
                  newBoard[cx][cy].revealed = true;
                });
                if (hit) {
                  setBoard(newBoard);
                  setStatus('lost');
                  const time = (Date.now() - startTime) / 1000;
                  setElapsed(time);
                  const finalBV = calculate3BV(newBoard);
                  setBV(finalBV);
                  setBVPS(time > 0 ? finalBV / time : finalBV);
                  playSound('boom');
                  setAriaMessage('Boom! Game over');
                  return;
                }
              }
            }
          }
        }
      }
    } else {
      if (cell.mine) {
        const { cells: revealed } = await computeRevealed(newBoard, [[x, y]]);
        revealed.forEach(([cx, cy]) => {
          newBoard[cx][cy].revealed = true;
        });
        setBoard(newBoard);
        setStatus('lost');
        const time = (Date.now() - startTime) / 1000;
        setElapsed(time);
        const finalBV = calculate3BV(newBoard);
        setBV(finalBV);
        setBVPS(time > 0 ? finalBV / time : finalBV);
        playSound('boom');
        spawnExplosion(x, y);
        setAriaMessage('Boom! Game over');
        return;
      }
      playSound('reveal');
      if (cell.adjacent === 0 && !prefersReducedMotion.current) {
        revealWave(newBoard, x, y, (count) => {
          setAriaMessage(`Revealed ${count} cells`);
          checkAndHandleWin(newBoard);
        });
        return;
      } else {
        const { cells: revealed } = await computeRevealed(newBoard, [[x, y]]);
        revealed.forEach(([cx, cy]) => {
          newBoard[cx][cy].revealed = true;
        });
        setAriaMessage(`Revealed cell at row ${x + 1}, column ${y + 1}`);
      }
    }

    setBoard(newBoard);
    checkAndHandleWin(newBoard);
  };

  const toggleFlag = (x, y) => {
    if (status !== 'playing' || paused || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (cell.revealed) return;

    if (cell.flagged) {
      cell.flagged = false;
      setFlags((f) => f - 1);
      flagAnim.current[`${x},${y}`] = { start: Date.now(), dir: -1 };
      if (useQuestionMarks) {
        cell.question = true;
        setAriaMessage(
          `Question marked cell at row ${x + 1}, column ${y + 1}`,
        );
      } else {
        setAriaMessage(
          `Unflagged cell at row ${x + 1}, column ${y + 1}`,
        );
      }
    } else if (cell.question) {
      cell.question = false;
      setAriaMessage(
        `Cleared mark at row ${x + 1}, column ${y + 1}`,
      );
    } else {
      cell.flagged = true;
      setFlags((f) => f + 1);
      flagAnim.current[`${x},${y}`] = { start: Date.now(), dir: 1 };
      setAriaMessage(
        `Flagged cell at row ${x + 1}, column ${y + 1}`,
      );
      spawnFlagBurst(x, y);
    }

    setBoard(newBoard);
    playSound('flag');
  };

  const handleChord = async (x, y) => {
    if (status !== 'playing' || paused || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (!cell.revealed || cell.adjacent === 0) return;
    let flagged = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < newBoard.length &&
          ny >= 0 &&
          ny < newBoard.length &&
          newBoard[nx][ny].flagged
        ) {
          flagged++;
        }
      }
    }
    if (flagged !== cell.adjacent) return;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < newBoard.length &&
          ny >= 0 &&
          ny < newBoard.length &&
          !newBoard[nx][ny].flagged
        ) {
          const { hit, cells: revealed } = await computeRevealed(
            newBoard,
            [[nx, ny]],
          );
          revealed.forEach(([cx, cy]) => {
            newBoard[cx][cy].revealed = true;
          });
          if (hit) {
            setBoard(newBoard);
            setStatus('lost');
            const time = (Date.now() - startTime) / 1000;
            setElapsed(time);
            const finalBV = calculate3BV(newBoard);
            setBV(finalBV);
            setBVPS(time > 0 ? finalBV / time : finalBV);
            playSound('boom');
            spawnExplosion(nx, ny);
            setAriaMessage('Boom! Game over');
            return;
          }
        }
      }
    }
    setBoard(newBoard);
    checkAndHandleWin(newBoard);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cellWidth = rect.width / effectiveSize;
    const cellHeight = rect.height / effectiveSize;
    const y = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientX - rect.left) / cellWidth)),
    );
    const x = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientY - rect.top) / cellHeight)),
    );
    setCursor({ x, y });
    setCursorVisible(true);
    setFacePressed(true);
    if (e.button === 0) {
      leftDown.current = true;
    } else if (e.button === 2) {
      rightDown.current = true;
      e.preventDefault();
    } else if (e.button === 1) {
      handleChord(x, y);
    }
  };

  const handleMouseUp = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cellWidth = rect.width / effectiveSize;
    const cellHeight = rect.height / effectiveSize;
    const y = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientX - rect.left) / cellWidth)),
    );
    const x = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientY - rect.top) / cellHeight)),
    );
    setCursor({ x, y });
    setFacePressed(false);
    if (e.button === 0) {
      if (rightDown.current) {
        handleChord(x, y);
        rightDown.current = false;
        chorded.current = true;
      } else if (!chorded.current) {
        handleClick(x, y);
      }
      leftDown.current = false;
    } else if (e.button === 2) {
      if (leftDown.current) {
        handleChord(x, y);
        leftDown.current = false;
        chorded.current = true;
      } else if (!chorded.current) {
        toggleFlag(x, y);
      }
      rightDown.current = false;
    }
    if (!leftDown.current && !rightDown.current) chorded.current = false;
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cellWidth = rect.width / effectiveSize;
    const cellHeight = rect.height / effectiveSize;
    const y = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientX - rect.left) / cellWidth)),
    );
    const x = Math.min(
      effectiveSize - 1,
      Math.max(0, Math.floor((e.clientY - rect.top) / cellHeight)),
    );
    setCursor({ x, y });
    setCursorVisible(true);
  };

  const handleMouseLeave = () => {
    leftDown.current = false;
    rightDown.current = false;
    chorded.current = false;
    setCursorVisible(false);
    setFacePressed(false);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (e.clientX === 0 && e.clientY === 0) {
      toggleFlag(cursor.x, cursor.y);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      setCursor((c) => ({ x: Math.max(0, c.x - 1), y: c.y }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowDown') {
      setCursor((c) => ({ x: Math.min(effectiveSize - 1, c.x + 1), y: c.y }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowLeft') {
      setCursor((c) => ({ x: c.x, y: Math.max(0, c.y - 1) }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowRight') {
      setCursor((c) => ({ x: c.x, y: Math.min(effectiveSize - 1, c.y + 1) }));
      setCursorVisible(true);
    } else if (e.key.toLowerCase() === 'f') {
      toggleFlag(cursor.x, cursor.y);
    } else if (e.key === ' ' || e.key === 'Enter') {
      handleClick(cursor.x, cursor.y);
    }
  };

  const reset = () => {
    workerRef.current?.terminate();
    initWorker();
    flagAnim.current = {};
    setBoard(null);
    setStatus('ready');
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setShareCode('');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    setBVPS(null);
    setCodeInput('');
    setFlags(0);
    setPaused(false);
    setAriaMessage('');
    setFacePressed(false);
    setFaceBtnDown(false);
    setCursor({ x: 0, y: 0 });
    setCursorVisible(false);
    setLastWin(null);
  };

  const copyCode = () => {
    if (typeof navigator !== 'undefined' && shareCode) {
      navigator.clipboard.writeText(shareCode);
    }
  };

  const loadFromCode = async () => {
    if (!codeInput) return;
    const parts = codeInput.trim().split('-');
    const newSeed = parseInt(parts[0], 36);
    if (Number.isNaN(newSeed)) return;
    workerRef.current?.terminate();
    initWorker();
    flagAnim.current = {};
    setSeed(newSeed);
    setShareCode('');
    setBoard(null);
    setStatus('ready');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    setBVPS(null);
    setFlags(0);
    setPaused(false);
    if (parts.length === 3) {
      const x = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const newBoard = generateBoard(config.size, config.mines, newSeed, x, y);
        setBoard(newBoard);
        setStatus('playing');
        setStartTime(Date.now());
        setShareCode(codeInput.trim());
        setBV(calculate3BV(newBoard));
        setFlags(0);
        const finalize = (count) => {
          setAriaMessage(`Revealed ${count} cells`);
          checkAndHandleWin(newBoard);
        };
        if (prefersReducedMotion.current) {
          const { cells } = await computeRevealed(newBoard, [[x, y]]);
          cells.forEach(([cx, cy]) => {
            newBoard[cx][cy].revealed = true;
          });
          setBoard(cloneBoard(newBoard));
          finalize(cells.length);
        } else {
          revealWave(newBoard, x, y, finalize);
        }
      }
    }
    setCodeInput('');
  };

  const loadSaved = () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('minesweeper-state');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.config) {
        setConfig(data.config);
        const match = Object.entries(DIFFICULTIES).find(([, value]) => value.size === data.config.size && value.mines === data.config.mines);
        if (match) setDifficulty(match[0]);
      }
      if (data.board) {
        const first = data.board[0]?.[0];
        const hydrated = Array.isArray(first) ? deserializeBoard(data.board) : data.board;
        setBoard(hydrated);
        setHasSave(true);
        if (!data.config) {
          const inferred = Object.entries(DIFFICULTIES).find(([, value]) => value.size === hydrated.length);
          if (inferred) {
            setDifficulty(inferred[0]);
            setConfig(DIFFICULTIES[inferred[0]]);
          }
        }
      } else {
        setHasSave(false);
      }
      if (data.status) setStatus(data.status);
      if (data.seed !== undefined) setSeed(data.seed);
      if (data.shareCode) setShareCode(data.shareCode);
      if (data.bv) setBV(data.bv);
      if (data.bvps !== undefined) setBVPS(data.bvps);
      if (data.flags) setFlags(data.flags);
      if (data.paused) setPaused(data.paused);
      if (data.status === 'playing' && !data.paused) {
        setStartTime(Date.now() - (data.elapsed || 0) * 1000);
        setElapsed(data.elapsed || 0);
      } else {
        if (data.startTime) setStartTime(data.startTime);
        if (data.elapsed) setElapsed(data.elapsed);
      }
    } catch {
      setHasSave(false);
    }
  };

  const togglePause = () => {
    if (status !== 'playing') return;
    if (!paused) {
      setPaused(true);
      setPauseStart(Date.now());
    } else {
      setPaused(false);
      setStartTime((s) => s + (Date.now() - pauseStart));
    }
  };

  const toggleSound = () => setSound((s) => !s);

  const handleDifficultySelect = (key) => {
    if (!DIFFICULTIES[key]) return;
    setDifficulty(key);
    setConfig(DIFFICULTIES[key]);
    reset();
  };

  const face =
    status === 'won'
      ? '😎'
      : status === 'lost'
      ? '😵'
      : facePressed
      ? '😮'
      : '🙂';

  return (
    <GameLayout gameId="minesweeper">
      <div className="relative flex h-full w-full justify-center overflow-y-auto bg-[color:var(--color-secondary)] p-4 text-[color:var(--color-text)]">
        <div className="flex w-full max-w-4xl flex-col gap-4">
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 shadow-lg shadow-black/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl shadow-inner transition active:translate-y-[1px] ${faceBtnDown
                      ? 'border-[color:var(--color-accent)] bg-[color:var(--color-surface)]'
                      : 'border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] hover:bg-[color:var(--color-surface)]'
                  }`}
                  onMouseDown={() => {
                    setFaceBtnDown(true);
                    setFacePressed(true);
                  }}
                  onMouseUp={() => {
                    setFaceBtnDown(false);
                    setFacePressed(false);
                    reset();
                  }}
                  onMouseLeave={() => {
                    setFaceBtnDown(false);
                    setFacePressed(false);
                  }}
                  aria-label="Reset game"
                >
                  {face}
                </button>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono text-[color:var(--kali-text-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--color-accent)]">⏱</span>
                    <span>{timeDisplay}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--color-accent)]">🏁</span>
                    <span>{bvpsDisplay === '--' ? '--' : `${bvpsDisplay}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--color-accent)]">🧨</span>
                    <span>{remainingMines}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--color-accent)]">⭐</span>
                    <span>{bestDisplay}s</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(DIFFICULTIES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleDifficultySelect(key)}
                    aria-pressed={difficulty === key}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)] ${
                      difficulty === key
                        ? 'border-transparent bg-[color:var(--color-accent)] text-[color:var(--color-inverse)] shadow-sm'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--kali-text-subtle)] hover:bg-[color:var(--color-surface-muted)]'
                    }`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-[color:var(--color-surface-muted)] px-2 py-1 font-semibold uppercase tracking-wide text-[color:var(--color-accent)]">
                Seed
              </span>
              <code className="rounded bg-[color:var(--color-surface)] px-2 py-1 font-mono text-[color:var(--kali-text)]">
                {seed.toString(36)}
              </code>
              {shareCode && (
                <button
                  onClick={copyCode}
                  className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                >
                  Copy share
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <label
                htmlFor="minesweeper-share-input"
                className="font-medium text-[color:var(--kali-text-subtle)]"
              >
                Load seed or code
              </label>
              <input
                id="minesweeper-share-input"
                className="min-w-[160px] flex-1 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 font-mono text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="seed-optional-x-y" aria-label="Load seed or code"
              />
              <button
                onClick={loadFromCode}
                className="rounded-lg bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-sm transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_88%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
              >
                Load
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 shadow-lg shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {hasSave && (
                    <button
                      onClick={loadSaved}
                      className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text-subtle)] transition hover:bg-[color:var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                    >
                      Load save
                    </button>
                  )}
                  <button
                    onClick={togglePause}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text-subtle)] transition hover:bg-[color:var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={toggleSound}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text-subtle)] transition hover:bg-[color:var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                  >
                    {sound ? 'Sound on' : 'Sound off'}
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
                  >
                    Settings
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={canvasSize}
                  height={canvasSize}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onContextMenu={handleContextMenu}
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  aria-label="Minesweeper grid"
                  className="w-full max-w-[min(100%,520px)] rounded-xl bg-[color:var(--color-surface)] shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-focus-ring)]"
                  style={{ imageRendering: 'pixelated', aspectRatio: '1 / 1' }}
                />
              </div>
              <p className="mt-4 text-center text-sm text-[color:var(--kali-text-muted)]">
                {status === 'ready'
                  ? 'Click or press Enter on any tile to begin.'
                  : status === 'playing'
                  ? paused
                    ? 'Game paused.'
                    : 'Sweep the field—flag suspected mines with right click or F.'
                  : status === 'won'
                  ? `Victory! 3BV ${bv} in ${timeDisplay}s.`
                  : `Boom! Game over. 3BV ${bv}.`}
              </p>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text-subtle)]">
                    Leaderboard
                  </h3>
                  <span className="rounded-full bg-[color:var(--color-surface-muted)] px-2 py-0.5 text-xs font-mono text-[color:var(--color-accent)]">
                    {DIFFICULTIES[difficulty].label}
                  </span>
                </div>
                {lastWin && lastWin.difficulty === difficulty && (
                  <div className="mt-3 rounded-lg border border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_18%,transparent)] px-3 py-2 text-xs text-[color:var(--color-text)]">
                    <strong className="font-semibold">New record:</strong> {lastWin.time.toFixed(2)}s on seed {lastWin.seed}
                  </div>
                )}
                {leaderboard.length ? (
                  <ol className="mt-3 space-y-2 text-sm font-mono">
                    {leaderboard.map((entry, index) => {
                      const isNew =
                        lastWin &&
                        lastWin.difficulty === difficulty &&
                        entry.time === lastWin.time &&
                        entry.seed === lastWin.seed;
                      return (
                        <li
                          key={`${entry.seed}-${entry.time}-${entry.date}`}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
                            isNew
                              ? 'border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[color:var(--color-text)]'
                              : 'border-transparent bg-[color:var(--color-surface)] text-[color:var(--kali-text-subtle)]'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-[color:var(--color-accent)]">#{index + 1}</span>
                            <span>{entry.time.toFixed(2)}s</span>
                          </span>
                          <span className="text-xs text-[color:var(--kali-text-faint)]">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--kali-text-faint)]">
                    Sweep the board to earn a spot on the leaderboard.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
        {showSettings && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[color:rgba(7,12,18,0.78)] backdrop-blur-sm">
            <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 text-sm shadow-xl shadow-black/30">
              <h2 className="text-center text-base font-semibold text-[color:var(--kali-text)]">
                Game settings
              </h2>
              <label className="flex items-center justify-between gap-3 text-[color:var(--kali-text-subtle)]">
                <span>Enable question marks</span>
                <input
                  type="checkbox"
                  checked={useQuestionMarks} aria-label="Enable question marks"
                  onChange={(e) => setUseQuestionMarks(e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-[color:var(--kali-text-subtle)]">
                <span>Show solver assist</span>
                <input
                  type="checkbox"
                  checked={showRisk} aria-label="Show solver assist"
                  onChange={(e) => setShowRisk(e.target.checked)}
                />
              </label>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full rounded-lg bg-[color:var(--color-accent)] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-sm transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_88%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-ring)]"
              >
                Close
              </button>
            </div>
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {ariaMessage}
        </div>
      </div>
    </GameLayout>
  );

};

export default Minesweeper;

