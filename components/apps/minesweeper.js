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

const CELL_SIZE = 32;
const DIFFICULTY_PRESETS = {
  beginner: { label: 'Beginner', size: 8, mines: 10 },
  intermediate: { label: 'Intermediate', size: 16, mines: 40 },
  expert: { label: 'Expert', size: 22, mines: 99 },
};

const DEFAULT_DIFFICULTY = 'beginner';
const MIN_BOARD_SIZE = 4;
const MAX_BOARD_SIZE = 24;
const SAFE_AREA_CELLS = 9;

const isPresetKey = (value) =>
  typeof value === 'string' && value in DIFFICULTY_PRESETS;

const findPresetForConfig = (size, mines) =>
  Object.entries(DIFFICULTY_PRESETS).find(
    ([, cfg]) => cfg.size === size && cfg.mines === mines,
  )?.[0] || null;

const resolveConfig = (difficulty, customSize, customMines) => {
  if (isPresetKey(difficulty)) return DIFFICULTY_PRESETS[difficulty];
  return { size: customSize, mines: customMines };
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

const generateBoard = (seed, sx, sy, size, mines) => {
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
    if (placed >= mines) break;
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

const calculateRiskMap = (board) => {
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
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('ready');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [shareCode, setShareCode] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [bv, setBV] = useState(0);
  const [bvps, setBVPS] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [flags, setFlags] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState(0);
  const [sound, setSound] = useState(true);
  const [ariaMessage, setAriaMessage] = useState('');
  const prefersReducedMotion = useRef(false);
  const [showRisk, setShowRisk] = usePersistedState(
    'minesweeperAssist',
    false,
  );
  const [useQuestionMarks, setUseQuestionMarks] = usePersistedState(
    'minesweeperQuestion',
    false,
  );
  const [difficulty, setDifficulty] = usePersistedState(
    'minesweeperDifficulty',
    DEFAULT_DIFFICULTY,
    (value) => value === 'custom' || isPresetKey(value),
  );
  const [customSize, setCustomSize] = usePersistedState(
    'minesweeperCustomSize',
    12,
    (value) =>
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= MIN_BOARD_SIZE &&
      value <= MAX_BOARD_SIZE,
  );
  const [customMines, setCustomMines] = usePersistedState(
    'minesweeperCustomMines',
    24,
    (value) => typeof value === 'number' && Number.isInteger(value) && value > 0,
  );
  const initialConfig = resolveConfig(difficulty, customSize, customMines);
  const [boardSize, setBoardSize] = useState(initialConfig.size);
  const [minesCount, setMinesCount] = useState(initialConfig.mines);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [pendingDifficulty, setPendingDifficulty] = useState(difficulty);
  const [pendingSize, setPendingSize] = useState(String(initialConfig.size));
  const [pendingMines, setPendingMines] = useState(String(initialConfig.mines));
  const [hasSave, setHasSave] = useState(false);
  const [facePressed, setFacePressed] = useState(false);
  const [faceBtnDown, setFaceBtnDown] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const leftDown = useRef(false);
  const rightDown = useRef(false);
  const chorded = useRef(false);
  const flagAnim = useRef({});

  const applyBoardConfig = (size, mines) => {
    setBoardSize(size);
    setMinesCount(mines);
    const presetKey = findPresetForConfig(size, mines);
    if (presetKey) {
      setDifficulty(presetKey);
    } else {
      setDifficulty('custom');
      setCustomSize(size);
      setCustomMines(mines);
    }
  };

  useEffect(() => {
    if (!showSettings) return;
    const presetKey = findPresetForConfig(boardSize, minesCount);
    setPendingDifficulty(presetKey || 'custom');
    setPendingSize(String(boardSize));
    setPendingMines(String(minesCount));
    setSettingsError('');
  }, [showSettings, boardSize, minesCount]);

  useEffect(() => {
    initWorker();
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const best = localStorage.getItem('minesweeper-best-time');
      if (best) setBestTime(parseFloat(best));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('minesweeper-state');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          let loadedSize =
            typeof data.boardSize === 'number' ? data.boardSize : undefined;
          let loadedMines =
            typeof data.minesCount === 'number' ? data.minesCount : undefined;
          if (data.board) {
            const first = data.board[0]?.[0];
            const loadedBoard = Array.isArray(first)
              ? deserializeBoard(data.board)
              : data.board;
            setBoard(loadedBoard);
            setHasSave(true);
            loadedSize = loadedSize ?? loadedBoard.length;
            if (loadedMines === undefined) {
              loadedMines = loadedBoard.reduce(
                (total, row) =>
                  total + row.reduce((acc, cell) => acc + (cell.mine ? 1 : 0), 0),
                0,
              );
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
          if (loadedSize !== undefined && loadedMines !== undefined) {
            applyBoardConfig(loadedSize, loadedMines);
          }
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
    let frame;
    const draw = () => {
      const size = board ? board.length : boardSize;
      const canvasLength = size * CELL_SIZE;
      ctx.clearRect(0, 0, canvasLength, canvasLength);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const riskMap = showRisk && board ? calculateRiskMap(board) : null;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const cell = board
            ? board[x][y]
            : {
                revealed: false,
                flagged: false,
                question: false,
                adjacent: 0,
                mine: false,
              };
          const px = y * CELL_SIZE;
          const py = x * CELL_SIZE;
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 1;
          const isCursor =
            cursorVisible && cursor.x === x && cursor.y === y && !cell.revealed;
          ctx.fillStyle = cell.revealed
            ? '#d1d5db'
            : isCursor
            ? leftDown.current || rightDown.current
              ? '#4b5563'
              : '#374151'
            : '#1f2937';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
          const key = `${x},${y}`;
          if (cell.revealed) {
            if (cell.mine) {
              ctx.fillStyle = '#000';
              ctx.fillText('💣', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
            } else if (cell.adjacent > 0) {
              ctx.fillStyle = numberColors[cell.adjacent - 1] || '#000';
              ctx.fillText(
                cell.adjacent,
                px + CELL_SIZE / 2,
                py + CELL_SIZE / 2,
              );
            }
          } else {
            const anim = flagAnim.current[key];
            if (cell.flagged || anim) {
              let scale = 1;
              if (anim) {
                const t = Math.min((Date.now() - anim.start) / 200, 1);
                scale = anim.dir > 0 ? t : 1 - t;
                if (t >= 1) delete flagAnim.current[key];
              }
              if (cell.flagged || scale > 0) {
                ctx.save();
                ctx.translate(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
                ctx.scale(scale, scale);
                ctx.fillStyle = '#f00';
                ctx.fillText('🚩', 0, 0);
                ctx.restore();
              }
            } else if (cell.question) {
              ctx.fillStyle = '#fff';
              ctx.fillText('?', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
            } else if (showRisk && riskMap) {
              const r = riskMap[x][y];
              if (r > 0) {
                ctx.fillStyle = `rgba(255,0,0,${r * 0.4})`;
                ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
              }
            }
          }
        }
      }
      if (paused && status === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvasLength, canvasLength);
        ctx.fillStyle = '#fff';
        ctx.fillText('Paused', canvasLength / 2, canvasLength / 2);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [
    board,
    boardSize,
    status,
    paused,
    flags,
    showRisk,
    cursor,
    cursorVisible,
  ]);

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
          boardSize,
          minesCount,
          difficulty,
          customSize,
          customMines,
        };
        localStorage.setItem('minesweeper-state', JSON.stringify(data));
        setHasSave(!!board);
      } catch {}
    }
  }, [
    board,
    status,
    seed,
    shareCode,
    startTime,
    elapsed,
    bv,
    bvps,
    flags,
    paused,
    boardSize,
    minesCount,
    difficulty,
    customSize,
    customMines,
  ]);

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

  const checkAndHandleWin = (newBoard) => {
    if (checkWin(newBoard)) {
      setStatus('won');
      const time = (Date.now() - startTime) / 1000;
      setElapsed(time);
      const finalBV = calculate3BV(newBoard);
      setBV(finalBV);
      setBVPS(time > 0 ? finalBV / time : finalBV);
      if (typeof window !== 'undefined') {
        if (!bestTime || time < bestTime) {
          setBestTime(time);
          localStorage.setItem('minesweeper-best-time', time.toString());
        }
      }
    }
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
    const newBoard = generateBoard(seed, x, y, boardSize, minesCount);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setShareCode(
      `${seed.toString(36)}-${x}-${y}-${boardSize}-${minesCount}`,
    );
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
    const size = newBoard.length;

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
              nx < size &&
              ny >= 0 &&
              ny < size &&
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
              nx < size &&
              ny >= 0 &&
              ny < size &&
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
    }

    setBoard(newBoard);
    playSound('flag');
  };

  const handleChord = async (x, y) => {
    if (status !== 'playing' || paused || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (!cell.revealed || cell.adjacent === 0) return;
    const size = newBoard.length;
    let flagged = 0;
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
          nx < size &&
          ny >= 0 &&
          ny < size &&
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
    setBoard(newBoard);
    checkAndHandleWin(newBoard);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const x = Math.floor((e.clientY - rect.top) / CELL_SIZE);
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
    const y = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const x = Math.floor((e.clientY - rect.top) / CELL_SIZE);
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
    const y = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const x = Math.floor((e.clientY - rect.top) / CELL_SIZE);
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
      setCursor((c) => ({ x: Math.min(boardSize - 1, c.x + 1), y: c.y }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowLeft') {
      setCursor((c) => ({ x: c.x, y: Math.max(0, c.y - 1) }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowRight') {
      setCursor((c) => ({ x: c.x, y: Math.min(boardSize - 1, c.y + 1) }));
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
    let nextSize = boardSize;
    let nextMines = minesCount;
    if (parts.length >= 5) {
      const parsedSize = parseInt(parts[3], 10);
      const parsedMines = parseInt(parts[4], 10);
      if (!Number.isNaN(parsedSize) && !Number.isNaN(parsedMines)) {
        nextSize = parsedSize;
        nextMines = parsedMines;
      }
    } else if (parts.length >= 3) {
      nextSize = DIFFICULTY_PRESETS.beginner.size;
      nextMines = DIFFICULTY_PRESETS.beginner.mines;
    }
    if (Number.isInteger(nextSize) && Number.isInteger(nextMines)) {
      applyBoardConfig(nextSize, nextMines);
    }
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
        const newBoard = generateBoard(newSeed, x, y, nextSize, nextMines);
        setBoard(newBoard);
        setStatus('playing');
        setStartTime(Date.now());
        setShareCode(
          `${newSeed.toString(36)}-${x}-${y}-${nextSize}-${nextMines}`,
        );
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
      let loadedSize =
        typeof data.boardSize === 'number' ? data.boardSize : undefined;
      let loadedMines =
        typeof data.minesCount === 'number' ? data.minesCount : undefined;
      if (data.board) {
        const first = data.board[0]?.[0];
        const loadedBoard = Array.isArray(first)
          ? deserializeBoard(data.board)
          : data.board;
        setBoard(loadedBoard);
        setHasSave(true);
        loadedSize = loadedSize ?? loadedBoard.length;
        if (loadedMines === undefined) {
          loadedMines = loadedBoard.reduce(
            (total, row) =>
              total + row.reduce((acc, cell) => acc + (cell.mine ? 1 : 0), 0),
            0,
          );
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
      if (loadedSize !== undefined && loadedMines !== undefined) {
        applyBoardConfig(loadedSize, loadedMines);
      }
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

  const applySettings = () => {
    const selection = pendingDifficulty;
    let nextSize;
    let nextMines;
    if (selection === 'custom') {
      const sizeValue = parseInt(pendingSize, 10);
      const minesValue = parseInt(pendingMines, 10);
      if (Number.isNaN(sizeValue) || Number.isNaN(minesValue)) {
        setSettingsError('Enter valid numbers for board size and mines.');
        return;
      }
      if (sizeValue < MIN_BOARD_SIZE || sizeValue > MAX_BOARD_SIZE) {
        setSettingsError(
          `Board size must be between ${MIN_BOARD_SIZE} and ${MAX_BOARD_SIZE}.`,
        );
        return;
      }
      const safeCapacity = sizeValue * sizeValue - SAFE_AREA_CELLS;
      if (safeCapacity < 1) {
        setSettingsError('Board size is too small for the starting safe zone.');
        return;
      }
      if (minesValue < 1 || minesValue > safeCapacity) {
        setSettingsError(
          `Mines must be between 1 and ${safeCapacity} to keep a safe opening.`,
        );
        return;
      }
      nextSize = sizeValue;
      nextMines = minesValue;
    } else {
      const preset = DIFFICULTY_PRESETS[selection];
      if (!preset) {
        setSettingsError('Select a difficulty preset.');
        return;
      }
      nextSize = preset.size;
      nextMines = preset.mines;
    }
    setPendingSize(String(nextSize));
    setPendingMines(String(nextMines));
    setPendingDifficulty(selection);
    applyBoardConfig(nextSize, nextMines);
    setSettingsError('');
    setShowSettings(false);
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
  const canvasSize = boardSize * CELL_SIZE;

  return (
    <GameLayout gameId="minesweeper">
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2 flex items-center space-x-2">
        <span>Seed:</span>
        <span className="font-mono">{seed.toString(36)}</span>
        {shareCode && (
          <button
            onClick={copyCode}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy Code
          </button>
        )}
      </div>
      <div className="mb-2 flex items-center space-x-2">
        <input
          className="px-1 text-black"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="seed or share code"
        />
        <button
          onClick={loadFromCode}
          className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Load
        </button>
      </div>
      <div className="mb-2">Mines: {minesCount - flags}</div>
      <div className="mb-2">
        3BV: {bv}
        {(status === 'won' || status === 'lost') && bvps !== null
          ? ` | 3BV/s: ${bvps.toFixed(2)}`
          : ''}
        {` | Best: ${bestTime ? bestTime.toFixed(2) : '--'}s`}
        {(status === 'won' || status === 'lost')
          ? ` | Time: ${elapsed.toFixed(2)}s`
          : ''}
      </div>
      <div className="mb-2">
        <button
          className={`w-8 h-8 text-xl bg-gray-700 rounded border-2 ${faceBtnDown ? 'border-gray-400 translate-y-[1px]' : 'border-gray-600'}`}
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
      </div>
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
        className="bg-gray-700 mb-4"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-2 mb-2">
        {status === 'ready'
          ? 'Click any cell to start'
          : status === 'playing'
          ? paused
            ? 'Paused'
            : 'Game in progress'
          : status === 'won'
          ? `You win! 3BV: ${bv}`
          : `Boom! Game over (3BV: ${bv})`}
      </div>
      <div className="flex space-x-2">
        {hasSave && (
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={loadSaved}
          >
            Load Save
          </button>
        )}
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleSound}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
      </div>
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded max-w-sm w-full">
            <h2 className="mb-2 text-center">Settings</h2>
            <fieldset className="mb-3">
              <legend className="mb-1 font-semibold">Difficulty</legend>
              <div className="space-y-2">
                {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="difficulty"
                      value={key}
                      checked={pendingDifficulty === key}
                      onChange={() => {
                        setPendingDifficulty(key);
                        setPendingSize(String(preset.size));
                        setPendingMines(String(preset.mines));
                        setSettingsError('');
                      }}
                    />
                    <span>{`${preset.label} (${preset.size}x${preset.size}, ${preset.mines} mines)`}</span>
                  </label>
                ))}
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="difficulty"
                    value="custom"
                    checked={pendingDifficulty === 'custom'}
                    onChange={() => {
                      setPendingDifficulty('custom');
                      setPendingSize(String(customSize));
                      setPendingMines(String(customMines));
                      setSettingsError('');
                    }}
                  />
                  <span>Custom</span>
                </label>
              </div>
            </fieldset>
            <div className="mb-3 grid gap-2">
              <label className="flex flex-col">
                <span className="text-sm">Board size</span>
                <input
                  type="number"
                  min={MIN_BOARD_SIZE}
                  max={MAX_BOARD_SIZE}
                  value={pendingSize}
                  onChange={(e) => setPendingSize(e.target.value)}
                  disabled={pendingDifficulty !== 'custom'}
                  className="text-black px-2 py-1 rounded"
                />
                <span className="text-xs text-gray-300">
                  {`Allowed range: ${MIN_BOARD_SIZE}-${MAX_BOARD_SIZE}`}
                </span>
              </label>
              <label className="flex flex-col">
                <span className="text-sm">Mines</span>
                <input
                  type="number"
                  min={1}
                  value={pendingMines}
                  onChange={(e) => setPendingMines(e.target.value)}
                  disabled={pendingDifficulty !== 'custom'}
                  className="text-black px-2 py-1 rounded"
                />
              </label>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <label className="mr-4">Question Marks</label>
              <input
                type="checkbox"
                checked={useQuestionMarks}
                onChange={(e) => setUseQuestionMarks(e.target.checked)}
              />
            </div>
            <div className="mb-2 flex items-center justify-between">
              <label className="mr-4">Solver Assist</label>
              <input
                type="checkbox"
                checked={showRisk}
                onChange={(e) => setShowRisk(e.target.checked)}
              />
            </div>
            {settingsError && (
              <div className="mb-2 text-sm text-red-400" role="alert">
                {settingsError}
              </div>
            )}
            <div className="mt-3 flex justify-end space-x-2">
              <button
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => {
                  setShowSettings(false);
                  setSettingsError('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded"
                onClick={applySettings}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
        <div aria-live="polite" className="sr-only">{ariaMessage}</div>
      </div>
    </GameLayout>
  );
};

export default Minesweeper;

