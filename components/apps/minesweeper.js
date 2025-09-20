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

const DEFAULT_SIZE = 8;
const DEFAULT_MINES = 10;
export const MIN_BOARD_SIZE = 4;
export const MAX_BOARD_SIZE = 24;
const MIN_MINES = 1;
const CELL_SIZE = 32;

export const validateConfig = (sizeInput, minesInput) => {
  const sizeNumber = Number(sizeInput);
  if (!Number.isFinite(sizeNumber)) {
    return { valid: false, error: 'Board size must be a number.' };
  }
  const size = Math.floor(sizeNumber);
  if (size < MIN_BOARD_SIZE || size > MAX_BOARD_SIZE) {
    return {
      valid: false,
      error: `Board size must be between ${MIN_BOARD_SIZE} and ${MAX_BOARD_SIZE}.`,
    };
  }

  const minesNumber = Number(minesInput);
  if (!Number.isFinite(minesNumber)) {
    return { valid: false, error: 'Mine count must be a number.' };
  }
  const mines = Math.floor(minesNumber);
  if (mines < MIN_MINES) {
    return {
      valid: false,
      error: 'Mine count must be at least 1.',
    };
  }

  const maxMines = size * size - 1;
  if (mines > maxMines) {
    return {
      valid: false,
      error: `Mine count must be between ${MIN_MINES} and ${maxMines}.`,
    };
  }

  return { valid: true, size, mines, maxMines };
};

const PRESETS = [
  { id: 'beginner', label: 'Beginner', size: 8, mines: 10 },
  { id: 'intermediate', label: 'Intermediate', size: 16, mines: 40 },
  { id: 'expert', label: 'Expert', size: 24, mines: 99 },
];

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
              if (mx < 0 || mx >= size || my < 0 || my >= size)
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
  const [boardSize, setBoardSize] = useState(DEFAULT_SIZE);
  const [mineCount, setMineCount] = useState(DEFAULT_MINES);
  const [customSize, setCustomSize] = useState(DEFAULT_SIZE.toString());
  const [customMines, setCustomMines] = useState(DEFAULT_MINES.toString());
  const [configError, setConfigError] = useState('');
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
  const [showSettings, setShowSettings] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [facePressed, setFacePressed] = useState(false);
  const [faceBtnDown, setFaceBtnDown] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const leftDown = useRef(false);
  const rightDown = useRef(false);
  const chorded = useRef(false);
  const flagAnim = useRef({});
  const canvasSize = boardSize * CELL_SIZE;
  const maxMines = Math.max(boardSize * boardSize - 1, 1);

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
          const configResult = validateConfig(
            data.size ?? DEFAULT_SIZE,
            data.mines ?? DEFAULT_MINES,
          );
          const targetSize = configResult.valid
            ? configResult.size
            : DEFAULT_SIZE;
          const targetMines = configResult.valid
            ? configResult.mines
            : Math.min(DEFAULT_MINES, targetSize * targetSize - 1);
          setBoardSize(targetSize);
          setMineCount(targetMines);
          setCustomSize(targetSize.toString());
          setCustomMines(targetMines.toString());

          if (data.board) {
            const stored = Array.isArray(data.board[0])
              ? deserializeBoard(data.board)
              : data.board;
            if (
              Array.isArray(stored) &&
              stored.length === targetSize &&
              stored[0]?.length === targetSize
            ) {
              setBoard(stored);
              setHasSave(true);
            } else {
              setHasSave(false);
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
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const riskMap = showRisk && board ? calculateRiskMap(board) : null;
      for (let x = 0; x < boardSize; x++) {
        for (let y = 0; y < boardSize; y++) {
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
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.fillStyle = '#fff';
        ctx.fillText('Paused', canvasSize / 2, canvasSize / 2);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
    }, [board, status, paused, flags, showRisk, cursor, cursorVisible, boardSize, canvasSize]);

  useEffect(() => {
    if (!useQuestionMarks && board) {
      const newBoard = cloneBoard(board);
      let changed = false;
      for (let x = 0; x < newBoard.length; x++) {
        for (let y = 0; y < newBoard[x].length; y++) {
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
          size: boardSize,
          mines: mineCount,
        };
        localStorage.setItem('minesweeper-state', JSON.stringify(data));
        setHasSave(!!board);
      } catch {}
    }
  }, [board, status, seed, shareCode, startTime, elapsed, bv, bvps, flags, paused, boardSize, mineCount]);

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
    const size = boardSize;
    const mines = Math.min(mineCount, size * size - 1);
    flagAnim.current = {};
    const newBoard = generateBoard(seed, x, y, size, mines);
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
    const size = newBoard.length;
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
    const size = newBoard.length;
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
    const size = board ? board.length : boardSize;
    const y = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientX - rect.left) / CELL_SIZE)),
    );
    const x = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientY - rect.top) / CELL_SIZE)),
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
    const size = board ? board.length : boardSize;
    const y = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientX - rect.left) / CELL_SIZE)),
    );
    const x = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientY - rect.top) / CELL_SIZE)),
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
    const size = board ? board.length : boardSize;
    const y = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientX - rect.left) / CELL_SIZE)),
    );
    const x = Math.max(
      0,
      Math.min(size - 1, Math.floor((e.clientY - rect.top) / CELL_SIZE)),
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
    const limit = board ? board.length : boardSize;
    if (limit <= 0) return;
    if (e.key === 'ArrowUp') {
      setCursor((c) => ({ x: Math.max(0, c.x - 1), y: c.y }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowDown') {
      setCursor((c) => ({ x: Math.min(limit - 1, c.x + 1), y: c.y }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowLeft') {
      setCursor((c) => ({ x: c.x, y: Math.max(0, c.y - 1) }));
      setCursorVisible(true);
    } else if (e.key === 'ArrowRight') {
      setCursor((c) => ({ x: c.x, y: Math.min(limit - 1, c.y + 1) }));
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
    setHasSave(false);
  };

  const applyConfig = (size, mines) => {
    setBoardSize(size);
    setMineCount(mines);
    setCustomSize(size.toString());
    setCustomMines(mines.toString());
    setConfigError('');
    reset();
  };

  const handlePresetSelect = (preset) => {
    const result = validateConfig(preset.size, preset.mines);
    if (!result.valid) {
      setConfigError(result.error);
      return;
    }
    applyConfig(result.size, result.mines);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const result = validateConfig(customSize, customMines);
    if (!result.valid) {
      setConfigError(result.error);
      return;
    }
    applyConfig(result.size, result.mines);
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
        const size = boardSize;
        const mines = Math.min(mineCount, size * size - 1);
        const newBoard = generateBoard(newSeed, x, y, size, mines);
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
      const configResult = validateConfig(
        data.size ?? boardSize,
        data.mines ?? mineCount,
      );
      const targetSize = configResult.valid ? configResult.size : boardSize;
      const targetMines = configResult.valid ? configResult.mines : mineCount;
      if (configResult.valid) {
        setBoardSize(targetSize);
        setMineCount(targetMines);
        setCustomSize(targetSize.toString());
        setCustomMines(targetMines.toString());
      }
      if (data.board) {
        const stored = Array.isArray(data.board[0])
          ? deserializeBoard(data.board)
          : data.board;
        if (
          Array.isArray(stored) &&
          stored.length === targetSize &&
          stored[0]?.length === targetSize
        ) {
          setBoard(stored);
          setHasSave(true);
        } else {
          setHasSave(false);
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
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
        <div className="w-full max-w-xl mb-4">
          <div className="mb-2 flex flex-wrap justify-center gap-2">
            {PRESETS.map((preset) => {
              const isActive =
                boardSize === preset.size && mineCount === preset.mines;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-3 py-1 rounded border transition focus:outline-none focus:ring ${
                    isActive
                      ? 'border-blue-400 bg-gray-700'
                      : 'border-transparent bg-gray-700 hover:bg-gray-600'
                  }`}
                  aria-pressed={isActive}
                >
                  {preset.label}{' '}
                  <span className="text-xs text-gray-300">
                    ({preset.size}×{preset.size}, {preset.mines} mines)
                  </span>
                </button>
              );
            })}
          </div>
          <form
            onSubmit={handleCustomSubmit}
            className="flex flex-wrap items-end justify-center gap-3"
          >
            <label htmlFor="minesweeper-size" className="flex flex-col text-sm">
              <span id="minesweeper-size-label">Size</span>
              <input
                id="minesweeper-size"
                type="number"
                inputMode="numeric"
                className="mt-1 w-24 rounded border border-gray-600 bg-white px-2 py-1 text-black"
                value={customSize}
                min={MIN_BOARD_SIZE}
                max={MAX_BOARD_SIZE}
                step={1}
                aria-labelledby="minesweeper-size-label"
                onChange={(e) => setCustomSize(e.target.value)}
              />
            </label>
            <label htmlFor="minesweeper-mines" className="flex flex-col text-sm">
              <span id="minesweeper-mines-label">Mines</span>
              <input
                id="minesweeper-mines"
                type="number"
                inputMode="numeric"
                className="mt-1 w-28 rounded border border-gray-600 bg-white px-2 py-1 text-black"
                value={customMines}
                min={MIN_MINES}
                max={maxMines}
                step={1}
                aria-labelledby="minesweeper-mines-label"
                onChange={(e) => setCustomMines(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring"
            >
              Start Custom Game
            </button>
          </form>
          {configError && (
            <p className="mt-2 text-center text-sm text-red-400">{configError}</p>
          )}
          <p className="mt-2 text-center text-xs text-gray-300">
            Current board: {boardSize}×{boardSize} with {mineCount} mines (max {maxMines}).
          </p>
        </div>
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
            <label htmlFor="minesweeper-seed-input" className="sr-only">
              Seed or share code
            </label>
            <input
              id="minesweeper-seed-input"
              className="px-1 text-black"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="seed or share code"
              aria-label="Seed or share code"
            />
          <button
            onClick={loadFromCode}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Load
          </button>
        </div>
        <div className="mb-2">Mines: {Math.max(mineCount - flags, 0)}</div>
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
            aria-label="Minesweeper board"
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
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="mb-2 text-center">Settings</h2>
              <div className="mb-2 flex items-center">
                <label htmlFor="question-marks-toggle" className="w-40">
                  Question Marks
                </label>
                <input
                  id="question-marks-toggle"
                  type="checkbox"
                  checked={useQuestionMarks}
                  aria-label="Toggle question marks"
                  onChange={(e) => setUseQuestionMarks(e.target.checked)}
                />
              </div>
              <div className="mb-2 flex items-center">
                <label htmlFor="solver-assist-toggle" className="w-40">
                  Solver Assist
                </label>
                <input
                  id="solver-assist-toggle"
                  type="checkbox"
                  checked={showRisk}
                  aria-label="Toggle solver assist"
                  onChange={(e) => setShowRisk(e.target.checked)}
                />
            </div>
            <button
              className="mt-2 px-2 py-1 bg-blue-500"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
        <div aria-live="polite" className="sr-only">{ariaMessage}</div>
      </div>
    </GameLayout>
  );
};

export default Minesweeper;

