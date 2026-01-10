import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import useGameControls from './useGameControls';
import levelPack from './sokoban_levels.json';

const TILE = 32;
const DIRECTIONS = [
  { key: 'up', label: 'Up', icon: '↑', vector: { x: 0, y: -1 }, shortcut: '↑ / W' },
  { key: 'left', label: 'Left', icon: '←', vector: { x: -1, y: 0 }, shortcut: '← / A' },
  { key: 'down', label: 'Down', icon: '↓', vector: { x: 0, y: 1 }, shortcut: '↓ / S' },
  { key: 'right', label: 'Right', icon: '→', vector: { x: 1, y: 0 }, shortcut: '→ / D' },
];

const ALT_KEYBOARD_MOVES = {
  w: { x: 0, y: -1 },
  a: { x: -1, y: 0 },
  s: { x: 0, y: 1 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  A: { x: -1, y: 0 },
  S: { x: 0, y: 1 },
  D: { x: 1, y: 0 },
};

// Provide a lightweight structuredClone polyfill for browsers that lack support
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

const normalizeCell = (cell) => {
  if (cell === '@' || cell === '$') return ' ';
  if (cell === '+' || cell === '*') return '.';
  return cell;
};

const parseLevel = (level) => {
  const board = level.map((r) => r.split(''));
  let player = { x: 0, y: 0 };
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      const cell = board[y][x];
      if (cell === '@' || cell === '+') player = { x, y };
    }
  }
  return { board, player, moves: 0, pushes: 0 };
};

const parseLevelsFromText = (text) =>
  text
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map((lvl) => lvl.split('\n'));

const attemptMove = (state, dx, dy) => {
  const { board, player } = state;
  const x = player.x;
  const y = player.y;
  const target = board[y + dy]?.[x + dx];
  const beyond = board[y + 2 * dy]?.[x + 2 * dx];
  if (!target || target === '#') return null;
  const newBoard = board.map((r) => r.slice());
  const newPlayer = { ...player };
  const replacePlayerTile = () => {
    newBoard[y][x] = newBoard[y][x] === '+' ? '.' : ' ';
  };
  let push = false;
  let movedCrate = null;
  if (target === ' ' || target === '.') {
    replacePlayerTile();
    newBoard[y + dy][x + dx] = target === '.' ? '+' : '@';
    newPlayer.x += dx;
    newPlayer.y += dy;
  } else if (target === '$' || target === '*') {
    if (beyond === ' ' || beyond === '.') {
      replacePlayerTile();
      newBoard[y + dy][x + dx] = target === '*' ? '+' : '@';
      newBoard[y + 2 * dy][x + 2 * dx] = beyond === '.' ? '*' : '$';
      newPlayer.x += dx;
      newPlayer.y += dy;
      push = true;
      movedCrate = {
        from: { x: x + dx, y: y + dy },
        to: { x: x + 2 * dx, y: y + 2 * dy },
        onGoal: beyond === '.',
      };
    } else {
      return null;
    }
  } else {
    return null;
  }
  return { board: newBoard, player: newPlayer, push, movedCrate };
};

const checkWin = (board) => {
  for (const row of board) {
    if (row.includes('.') || row.includes('+')) return false;
  }
  return true;
};

const countGoalsAndCrates = (board) => {
  let goals = 0;
  let cratesOnGoal = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === '.' || cell === '+' || cell === '*') goals += 1;
      if (cell === '*') cratesOnGoal += 1;
    }
  }
  return { goals, cratesOnGoal };
};

const classifyDifficulty = (board) => {
  let crates = 0;
  let walls = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === '$' || cell === '*') crates += 1;
      if (cell === '#') walls += 1;
    }
  }
  const area = board.length * board[0].length;
  if (crates <= 3 && area <= 160) return 'Easy';
  if (crates <= 5 && area <= 220) return 'Intermediate';
  if (walls / area > 0.4 || crates >= 6) return 'Expert';
  return 'Advanced';
};

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const drawFloor = (ctx, px, py, size, isGoal) => {
  const gradient = ctx.createLinearGradient(px, py, px, py + size);
  if (isGoal) {
    gradient.addColorStop(0, '#2f3a4c');
    gradient.addColorStop(1, '#1c2433');
  } else {
    gradient.addColorStop(0, '#1f2933');
    gradient.addColorStop(1, '#151b24');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(px, py, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(px, py + size * 0.33);
  ctx.lineTo(px + size, py + size * 0.33);
  ctx.moveTo(px, py + size * 0.66);
  ctx.lineTo(px + size, py + size * 0.66);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(px + size * 0.1, py + size * 0.1, size * 0.8, size * 0.12);
};

const drawWall = (ctx, px, py, size) => {
  const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
  gradient.addColorStop(0, '#495365');
  gradient.addColorStop(1, '#1f2733');
  ctx.fillStyle = gradient;
  ctx.fillRect(px, py, size, size);

  ctx.strokeStyle = 'rgba(12,16,24,0.65)';
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeRect(
    px + ctx.lineWidth / 2,
    py + ctx.lineWidth / 2,
    size - ctx.lineWidth,
    size - ctx.lineWidth,
  );

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(px, py + size * 0.45);
  ctx.lineTo(px + size, py + size * 0.45);
  ctx.moveTo(px, py + size * 0.75);
  ctx.lineTo(px + size, py + size * 0.75);
  ctx.stroke();
};

const drawGoal = (ctx, px, py, size, isFilled) => {
  const radius = size * 0.26;
  const centerX = px + size / 2;
  const centerY = py + size / 2;
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.25,
    centerX,
    centerY,
    radius,
  );
  gradient.addColorStop(0, isFilled ? 'rgba(248,250,109,0.85)' : 'rgba(147,197,253,0.35)');
  gradient.addColorStop(1, isFilled ? 'rgba(202,138,4,0.7)' : 'rgba(37,99,235,0.12)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isFilled ? 'rgba(250,204,21,0.8)' : 'rgba(96,165,250,0.6)';
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
  ctx.stroke();
};

const drawCrate = (ctx, px, py, size, onGoal) => {
  const gradient = ctx.createLinearGradient(px, py, px, py + size);
  if (onGoal) {
    gradient.addColorStop(0, '#fbbf24');
    gradient.addColorStop(1, '#d97706');
  } else {
    gradient.addColorStop(0, '#d69b5a');
    gradient.addColorStop(1, '#8b5a2b');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(px + size * 0.08, py + size * 0.08, size * 0.84, size * 0.84);

  ctx.strokeStyle = 'rgba(51,30,11,0.65)';
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeRect(px + size * 0.1, py + size * 0.1, size * 0.8, size * 0.8);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(px + size * 0.1, py + size * 0.1);
  ctx.lineTo(px + size * 0.9, py + size * 0.9);
  ctx.moveTo(px + size * 0.9, py + size * 0.1);
  ctx.lineTo(px + size * 0.1, py + size * 0.9);
  ctx.stroke();

  if (onGoal) {
    ctx.save();
    ctx.shadowColor = 'rgba(250,204,21,0.6)';
    ctx.shadowBlur = size * 0.25;
    ctx.strokeStyle = 'rgba(250,204,21,0.75)';
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.strokeRect(px + size * 0.14, py + size * 0.14, size * 0.72, size * 0.72);
    ctx.restore();
  }
};

const drawPlayer = (ctx, px, py, size, onGoal) => {
  const bodyRadius = size * 0.32;
  const centerX = px + size / 2;
  const centerY = py + size / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(centerX, py + size * 0.78, bodyRadius * 0.95, bodyRadius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createLinearGradient(px, py, px, py + size);
  gradient.addColorStop(0, onGoal ? '#60a5fa' : '#38bdf8');
  gradient.addColorStop(1, onGoal ? '#1d4ed8' : '#0c4a6e');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY - size * 0.08, bodyRadius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(centerX, centerY - size * 0.08, bodyRadius * 0.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(centerX + bodyRadius * 0.18, centerY - size * 0.12, bodyRadius * 0.18, 0, Math.PI * 2);
  ctx.fill();
};

const drawPreviewOverlay = (ctx, preview, tileSize, pulse) => {
  if (!preview?.cell) return;
  const { x, y } = preview.cell;
  const px = x * tileSize;
  const py = y * tileSize;
  const alphaBase = preview.valid ? 0.25 : 0.4;
  const wobble = 0.35 + 0.3 * Math.sin(pulse * Math.PI * 2);
  ctx.save();
  ctx.lineWidth = Math.max(1, tileSize * 0.1);
  ctx.strokeStyle = preview.valid
    ? `rgba(96,165,250,${alphaBase + wobble * 0.25})`
    : `rgba(248,113,113,${alphaBase + wobble * 0.25})`;
  ctx.strokeRect(px + tileSize * 0.18, py + tileSize * 0.18, tileSize * 0.64, tileSize * 0.64);

  if (preview.direction && preview.origin) {
    const startX = (preview.origin.x + 0.5) * tileSize;
    const startY = (preview.origin.y + 0.5) * tileSize;
    const progress = preview.valid ? 0.35 + wobble * 0.18 : 0.28;
    const tipX = startX + preview.direction.x * tileSize * progress;
    const tipY = startY + preview.direction.y * tileSize * progress;
    const tailX = startX + preview.direction.x * tileSize * (progress - 0.25);
    const tailY = startY + preview.direction.y * tileSize * (progress - 0.25);
    ctx.lineWidth = Math.max(1, tileSize * 0.08);
    ctx.lineCap = 'round';
    ctx.strokeStyle = preview.valid
      ? `rgba(96,165,250,${0.65 + wobble * 0.1})`
      : `rgba(248,113,113,0.6)`;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }

  ctx.restore();
};

const drawBoard = (ctx, board, player, options = {}) => {
  const {
    tileSize = TILE,
    preview,
    previewPulse = 0,
    transition = 1,
    showGhost = true,
  } = options;

  const width = board[0].length * tileSize;
  const height = board.length * tileSize;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);

  const drawContent = () => {
    for (let y = 0; y < board.length; y += 1) {
      for (let x = 0; x < board[y].length; x += 1) {
        const cell = board[y][x];
        const normalized = normalizeCell(cell);
        const px = x * tileSize;
        const py = y * tileSize;

        if (normalized !== '#') {
          drawFloor(ctx, px, py, tileSize, normalized === '.');
        }

        if (normalized === '#') {
          drawWall(ctx, px, py, tileSize);
        }

        if (normalized === '.') {
          const isFilled = cell === '*';
          drawGoal(ctx, px, py, tileSize, isFilled);
        }

        if (cell === '$' || cell === '*') {
          drawCrate(ctx, px, py, tileSize, cell === '*');
        }

        const isPlayer = player.x === x && player.y === y;
        if (isPlayer) {
          drawPlayer(ctx, px, py, tileSize, normalized === '.');
        }
      }
    }
  };

  if (transition < 1) {
    ctx.save();
    ctx.globalAlpha = easeOutCubic(transition);
    drawContent();
    ctx.restore();
  } else {
    drawContent();
  }

  if (preview && showGhost) {
    if (preview.result?.movedCrate) {
      const { to, onGoal } = preview.result.movedCrate;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(previewPulse * Math.PI * 2);
      drawCrate(ctx, to.x * tileSize, to.y * tileSize, tileSize, onGoal);
      ctx.restore();
    }

    if (preview.result?.player) {
      const ghostCell = preview.result.board[preview.result.player.y][preview.result.player.x];
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(previewPulse * Math.PI * 2);
      drawPlayer(
        ctx,
        preview.result.player.x * tileSize,
        preview.result.player.y * tileSize,
        tileSize,
        normalizeCell(ghostCell) === '.',
      );
      ctx.restore();
    }

    drawPreviewOverlay(ctx, preview, tileSize, previewPulse);
  }
};

const defaultLevels = Array.isArray(levelPack.levels)
  ? levelPack.levels
  : parseLevelsFromText(levelPack);

const LevelThumbnail = ({
  level,
  index,
  active,
  onSelect,
}) => {
  const canvasRef = useRef(null);
  const parsed = useMemo(() => parseLevel(level), [level]);
  const difficulty = useMemo(() => classifyDifficulty(parsed.board), [parsed.board]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tileSize = 14;
    const width = parsed.board[0].length * tileSize;
    const height = parsed.board.length * tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawBoard(ctx, parsed.board, parsed.player, {
      tileSize,
      preview: null,
      transition: 1,
      showGhost: false,
    });
    ctx.restore();
  }, [parsed.board, parsed.player]);

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`group flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left shadow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
        active
          ? 'border-sky-400/80 bg-sky-950/60 text-slate-50 shadow-sky-900/40'
          : 'border-slate-700/70 bg-slate-900/50 text-slate-200 hover:border-sky-500/50 hover:bg-slate-800/60'
      }`}
      aria-label={`Select level ${index + 1} (${difficulty})`}
    >
      <canvas ref={canvasRef} className="rounded-lg bg-slate-950/70" aria-hidden="true" />
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-slate-100">Level {index + 1}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold tracking-wide ${
            difficulty === 'Easy'
              ? 'bg-emerald-600/30 text-emerald-200'
              : difficulty === 'Intermediate'
              ? 'bg-sky-600/30 text-sky-200'
              : difficulty === 'Advanced'
              ? 'bg-violet-600/30 text-violet-200'
              : 'bg-amber-600/30 text-amber-200'
          }`}
        >
          {difficulty}
        </span>
      </div>
    </button>
  );
};

const Sokoban = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef();
  const sliderRaf = useRef();
  const stateRef = useRef();
  const historyRef = useRef([]);
  const historyIndexRef = useRef(0);
  const previewRef = useRef({ direction: null, cell: null, valid: false, result: null, origin: null });
  const previewPhaseRef = useRef(0);
  const transitionRef = useRef(1);
  const lastFrameRef = useRef(0);
  const liveRef = useRef(null);
  const prefersReducedMotion = useRef(false);
  const closeButtonRef = useRef(null);

  const [levels, setLevels] = useState(defaultLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [state, setState] = useState(() => parseLevel(defaultLevels[0]));
  const [historyIndex, setHistoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState(null);
  const [scale, setScale] = useState(1);
  const [isLevelModalOpen, setLevelModalOpen] = useState(false);
  const [importError, setImportError] = useState('');

  stateRef.current = state;

  const goalStats = useMemo(() => countGoalsAndCrates(state.board), [state.board]);
  const goalPercent = goalStats.goals
    ? Math.round((goalStats.cratesOnGoal / goalStats.goals) * 100)
    : 0;

  const boardWidth = state.board[0].length;
  const boardHeight = state.board.length;
  const canvasWidth = boardWidth * TILE;
  const canvasHeight = boardHeight * TILE;

  const loadBest = useCallback((idx) => {
    try {
      const stored = localStorage.getItem(`sokoban-best-${idx}`);
      setBest(stored ? JSON.parse(stored) : null);
    } catch {
      setBest(null);
    }
  }, []);

  const saveProgress = useCallback((idx, st) => {
    try {
      localStorage.setItem(
        `sokoban-progress-${idx}`,
        JSON.stringify({
          board: st.board.map((r) => r.join('')),
          player: st.player,
          moves: st.moves,
          pushes: st.pushes,
        }),
      );
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const loadState = useCallback((idx, lvls) => {
    try {
      const stored = localStorage.getItem(`sokoban-progress-${idx}`);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          board: data.board.map((r) => r.split('')),
          player: data.player,
          moves: data.moves || 0,
          pushes: data.pushes || 0,
        };
      }
    } catch {
      /* ignore parse errors */
    }
    return parseLevel(lvls[idx]);
  }, []);

  useEffect(() => {
    loadBest(levelIndex);
  }, [levelIndex, loadBest]);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => {
      prefersReducedMotion.current = event.matches;
    };
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const st = loadState(levelIndex, levels);
    transitionRef.current = 0;
    previewRef.current = { direction: null, cell: null, valid: false, result: null, origin: null };
    stateRef.current = st;
    setState(st);
    historyRef.current = [structuredClone(st)];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setImportError('');
  }, [levelIndex, levels, loadState]);

  useEffect(() => {
    if (!checkWin(state.board)) {
      saveProgress(levelIndex, state);
    } else {
      try {
        localStorage.removeItem(`sokoban-progress-${levelIndex}`);
      } catch {
        /* ignore storage errors */
      }
    }
  }, [state, levelIndex, saveProgress]);

  const updateScale = useCallback(() => {
    const container = containerRef.current;
    const current = stateRef.current;
    if (!container || !current) return;
    const width = current.board[0].length * TILE;
    const height = current.board.length * TILE;
    const availableWidth = container.clientWidth - 32;
    const availableHeight = window.innerHeight ? window.innerHeight * 0.55 : height;
    const scaleX = availableWidth > 0 ? Math.min(1.5, availableWidth / width) : 1;
    const scaleY = availableHeight > 0 ? Math.min(1.5, availableHeight / height) : 1;
    const nextScale = Math.max(0.6, Math.min(scaleX, scaleY));
    setScale(nextScale);
  }, []);

  useEffect(() => {
    updateScale();
  }, [state.board, updateScale]);

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const playBeep = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      /* ignore audio errors */
    }
  }, [sound]);

  const showPreview = useCallback((direction) => {
    const current = stateRef.current;
    const result = attemptMove(current, direction.x, direction.y);
    previewRef.current = {
      direction,
      origin: { ...current.player },
      cell: { x: current.player.x + direction.x, y: current.player.y + direction.y },
      valid: Boolean(result),
      result: result ? { ...result, board: result.board } : null,
    };
  }, []);

  const clearPreview = useCallback(() => {
    previewRef.current = { direction: null, cell: null, valid: false, result: null, origin: null };
  }, []);

  const move = useCallback(
    ({ x, y }) => {
      if (paused) return;
      const current = stateRef.current;
      const res = attemptMove(current, x, y);
      previewRef.current = { direction: null, cell: null, valid: false, result: null, origin: null };
      if (!res) return;
      const newState = {
        board: res.board,
        player: res.player,
        moves: current.moves + 1,
        pushes: current.pushes + (res.push ? 1 : 0),
      };
      historyRef.current = historyRef.current
        .slice(0, historyIndexRef.current + 1)
        .concat([structuredClone(newState)]);
      historyIndexRef.current = historyRef.current.length - 1;
      setHistoryIndex(historyIndexRef.current);
      stateRef.current = newState;
      setState(newState);
      playBeep();
      const progressKey = `sokoban-progress-${levelIndex}`;
      if (checkWin(res.board)) {
        const bestKey = `sokoban-best-${levelIndex}`;
        if (
          !best ||
          newState.moves < best.moves ||
          (newState.moves === best.moves && newState.pushes < best.pushes)
        ) {
          try {
            localStorage.setItem(
              bestKey,
              JSON.stringify({ moves: newState.moves, pushes: newState.pushes }),
            );
          } catch {
            /* ignore storage errors */
          }
          setBest({ moves: newState.moves, pushes: newState.pushes });
        }
        try {
          localStorage.removeItem(progressKey);
        } catch {
          /* ignore storage errors */
        }
      }
    },
    [best, levelIndex, paused, playBeep],
  );

  useGameControls(move);

  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    historyRef.current = historyRef.current.slice(0, -1);
    const idx = historyRef.current.length - 1;
    const prevState = structuredClone(historyRef.current[idx]);
    historyIndexRef.current = idx;
    setHistoryIndex(idx);
    stateRef.current = prevState;
    setState(prevState);
    saveProgress(levelIndex, prevState);
    if (liveRef.current) {
      liveRef.current.textContent = 'Undid last move';
    }
  }, [levelIndex, saveProgress]);

  const reset = useCallback(() => {
    const st = parseLevel(levels[levelIndex]);
    stateRef.current = st;
    setState(st);
    historyRef.current = [structuredClone(st)];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    saveProgress(levelIndex, st);
    transitionRef.current = 0;
    clearPreview();
    if (liveRef.current) {
      liveRef.current.textContent = 'Level reset';
    }
  }, [levelIndex, levels, saveProgress, clearPreview]);

  useEffect(() => {
    const handler = (e) => {
      if (ALT_KEYBOARD_MOVES[e.key]) {
        const target = e.target;
        const isInput =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable);
        if (isInput) return;
        if (e.repeat) return;
        e.preventDefault();
        move(ALT_KEYBOARD_MOVES[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move]);

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isInput) return;
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        undo();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        reset();
      } else if (e.key === 'L' && e.shiftKey) {
        e.preventDefault();
        setLevelModalOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reset, undo]);

  useEffect(() => {
    if (!isLevelModalOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLevelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLevelModalOpen]);

  useEffect(() => {
    if (isLevelModalOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isLevelModalOpen]);

  useEffect(() => {
    if (!isLevelModalOpen) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isLevelModalOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const render = (timestamp) => {
      const current = stateRef.current;
      if (!current) return;
      const width = current.board[0].length * TILE;
      const height = current.board.length * TILE;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      if (!prefersReducedMotion.current) {
        const last = lastFrameRef.current || timestamp;
        const delta = Math.min(0.12, (timestamp - last) / 1000);
        previewPhaseRef.current = (previewPhaseRef.current + delta * 1.6) % 1;
        if (transitionRef.current < 1) {
          transitionRef.current = Math.min(1, transitionRef.current + delta * 2.2);
        }
        lastFrameRef.current = timestamp;
      } else {
        previewPhaseRef.current = 0.25;
        transitionRef.current = 1;
      }

      drawBoard(ctx, current.board, current.player, {
        tileSize: TILE,
        preview: previewRef.current.direction ? previewRef.current : null,
        previewPulse: previewPhaseRef.current,
        transition: transitionRef.current,
        showGhost: true,
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused]);

  const handleRewind = useCallback(
    (e) => {
      const idx = Number(e.target.value);
      historyIndexRef.current = idx;
      setHistoryIndex(idx);
      const update = () => {
        const next = historyRef.current[idx];
        if (!next) return;
        const snapshot = structuredClone(next);
        stateRef.current = snapshot;
        setState(snapshot);
        if (liveRef.current) {
          liveRef.current.textContent = `Rewind to move ${idx}`;
        }
      };
      if (prefersReducedMotion.current) update();
      else {
        cancelAnimationFrame(sliderRaf.current);
        sliderRaf.current = requestAnimationFrame(update);
      }
    },
    [],
  );

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target.result;
          let parsed;
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            parsed = Array.isArray(data) ? data : data.levels;
          } else {
            parsed = parseLevelsFromText(text);
          }
          if (parsed && parsed.length) {
            setLevels(parsed);
            setLevelIndex(0);
            setImportError('');
          } else {
            setImportError('Unable to read any levels from that file.');
          }
        } catch {
          setImportError('Level import failed. Please check the file format.');
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const exportLevels = useCallback(() => {
    const text = levels.map((l) => l.join('\n')).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sokoban_levels.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [levels]);

  const levelDifficulty = useMemo(() => classifyDifficulty(state.board), [state.board]);

  const activePreview = previewRef.current.direction ? previewRef.current : null;

  return (
    <GameLayout gameId="sokoban" stage={levelIndex + 1}>
      <div ref={containerRef} className="mx-auto flex w-full max-w-5xl flex-col gap-5 text-slate-100">
        <div className="mx-auto w-full max-w-3xl rounded-2xl bg-slate-950/60 p-4 shadow-2xl ring-1 ring-slate-800/70">
          <div className="relative mx-auto flex justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-xl bg-slate-900/80 shadow-inner transition ${paused ? 'opacity-80' : 'opacity-100'}`}
              style={{
                width: `${canvasWidth * scale}px`,
                height: `${canvasHeight * scale}px`,
                transition: 'width 180ms ease, height 180ms ease, opacity 180ms ease',
              }}
              role="img"
              aria-label={`Sokoban board. ${goalStats.cratesOnGoal} of ${goalStats.goals} crates placed.`}
            />
            {activePreview && (
              <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-sky-400/40 mix-blend-screen" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl bg-slate-950/70 p-4 shadow-xl ring-1 ring-slate-800/70 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">
                Movement
              </div>
              <div className="grid w-max grid-cols-3 gap-2">
                <div aria-hidden="true" />
                <DirectionPadButton
                  direction={DIRECTIONS[0]}
                  onAction={move}
                  onPreview={showPreview}
                  onPreviewEnd={clearPreview}
                />
                <div aria-hidden="true" />
                <DirectionPadButton
                  direction={DIRECTIONS[1]}
                  onAction={move}
                  onPreview={showPreview}
                  onPreviewEnd={clearPreview}
                />
                <div className="flex h-full w-full items-center justify-center">
                  <span className="rounded-full bg-slate-900/60 px-2 py-1 text-[11px] font-semibold text-slate-300">
                    WASD + Arrows
                  </span>
                </div>
                <DirectionPadButton
                  direction={DIRECTIONS[3]}
                  onAction={move}
                  onPreview={showPreview}
                  onPreviewEnd={clearPreview}
                />
                <div aria-hidden="true" />
                <DirectionPadButton
                  direction={DIRECTIONS[2]}
                  onAction={move}
                  onPreview={showPreview}
                  onPreviewEnd={clearPreview}
                />
                <div aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={undo}
                className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm font-semibold shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                title="Undo (Ctrl/Cmd+Z or U)"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm font-semibold shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                title="Reset level (R)"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                  paused
                    ? 'border-emerald-500/50 bg-emerald-900/40 text-emerald-200'
                    : 'border-slate-700/70 bg-slate-900/70 hover:border-sky-500/50 hover:bg-slate-800/70'
                }`}
                title="Pause"
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => setSound((s) => !s)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                  sound
                    ? 'border-slate-700/70 bg-slate-900/70 hover:border-sky-500/50 hover:bg-slate-800/70'
                    : 'border-amber-500/60 bg-amber-900/40 text-amber-100'
                }`}
                title="Toggle sound"
              >
                {sound ? 'Sound On' : 'Sound Off'}
              </button>
              <button
                type="button"
                onClick={() => setLevelModalOpen(true)}
                className="rounded-lg border border-sky-600/50 bg-sky-900/40 px-3 py-2 text-sm font-semibold text-sky-100 shadow hover:border-sky-400/70 hover:bg-sky-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                title="Browse levels (Shift+L)"
              >
                Levels
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="sokoban-history" className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span>Move history</span>
              <span className="text-[11px] font-medium normal-case tracking-normal text-slate-300">
                {historyIndex} / {Math.max(0, historyRef.current.length - 1)}
              </span>
            </label>
            <input
              id="sokoban-history"
              type="range"
              min="0"
              max={Math.max(0, historyRef.current.length - 1)}
              value={historyIndex}
              onChange={handleRewind}
              className="w-full accent-sky-400"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, historyRef.current.length - 1)}
              aria-valuenow={historyIndex}
              aria-label="Rewind moves"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span>Goal progress</span>
              <span
                id="sokoban-goal-progress-label"
                className="text-[11px] font-medium normal-case tracking-normal text-slate-200"
              >
                {goalStats.cratesOnGoal}/{goalStats.goals}
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={goalStats.goals || 1}
              aria-valuenow={goalStats.cratesOnGoal}
              aria-labelledby="sokoban-goal-progress-label"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-300 to-emerald-300 transition-[width] duration-300"
                style={{ width: `${goalStats.goals ? Math.max(goalPercent, 4) : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Moves" value={state.moves} />
            <StatCard label="Pushes" value={state.pushes} />
            <StatCard label="Difficulty" value={levelDifficulty} subtle />
            <StatCard
              label="Best"
              value={best ? `${best.moves}/${best.pushes}` : '—'}
              accent={
                best &&
                checkWin(state.board) &&
                state.moves === best.moves &&
                state.pushes === best.pushes
              }
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="sokoban-import"
                className="cursor-pointer rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm font-semibold shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Import levels
                <input
                  id="sokoban-import"
                  type="file"
                  accept=".txt,.json"
                  onChange={handleFile}
                  className="sr-only"
                  aria-label="Import custom Sokoban level pack"
                />
              </label>
              <button
                type="button"
                onClick={exportLevels}
                className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm font-semibold shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Export current pack
              </button>
            </div>
            {importError && (
              <span className="text-sm text-amber-300">{importError}</span>
            )}
          </div>
        </div>

        <div ref={liveRef} aria-live="polite" className="sr-only" />
      </div>

      {isLevelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Select a level</h2>
                <p className="text-sm text-slate-300">
                  Preview each layout with difficulty tags and jump instantly.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setLevelModalOpen(false)}
                className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-100 shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Close
              </button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {levels.map((level, idx) => (
                <LevelThumbnail
                  key={idx}
                  level={level}
                  index={idx}
                  active={idx === levelIndex}
                  onSelect={(i) => {
                    setLevelIndex(i);
                    setLevelModalOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </GameLayout>
  );
};

const DirectionPadButton = ({ direction, onAction, onPreview, onPreviewEnd }) => (
  <button
    type="button"
    onClick={() => onAction(direction.vector)}
    onMouseEnter={() => onPreview(direction.vector)}
    onMouseLeave={onPreviewEnd}
    onFocus={() => onPreview(direction.vector)}
    onBlur={onPreviewEnd}
    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/70 text-lg font-semibold text-slate-100 shadow hover:border-sky-500/50 hover:bg-slate-800/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
    aria-label={`${direction.label} (${direction.shortcut})`}
  >
    {direction.icon}
  </button>
);

const StatCard = ({ label, value, accent = false, subtle = false }) => (
  <div
    className={`rounded-xl border px-3 py-3 text-center shadow transition ${
      accent
        ? 'border-emerald-500/60 bg-emerald-900/40 text-emerald-100 shadow-emerald-900/40'
        : subtle
        ? 'border-slate-700/60 bg-slate-900/60 text-slate-200'
        : 'border-slate-700/70 bg-slate-900/70 text-slate-100'
    }`}
  >
    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
      {label}
    </div>
    <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    {accent && (
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
        Optimal!
      </div>
    )}
  </div>
);

export default Sokoban;
