import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useCanvasResize from '../../hooks/useCanvasResize';
import { PieceGenerator } from '../../games/tetris/logic';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';

const WIDTH = 10;
const HEIGHT = 20;
const CELL_SIZE = 16;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
};

const CONFETTI_COLORS = Object.values(TETROMINOS).map((tetromino) => tetromino.color);

const createBoard = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const adjustColor = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.min(255, Math.max(0, v + amount));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
};

const createPiece = (type) => ({
  shape: TETROMINOS[type].shape.map((r) => r.slice()),
  color: TETROMINOS[type].color,
  type,
  rotation: 0,
});

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value) => value === null || isFiniteNumber(value);

const validateKeyBindings = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(defaultKeys).every(
    (key) => typeof value[key] === 'string' && value[key].length > 0,
  );
};

const KICKS = {
  JLSTZ: {
    0: {
      1: [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      3: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
    },
    1: {
      0: [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
      2: [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
    },
    2: {
      1: [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      3: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
    },
    3: {
      2: [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
      0: [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
    },
  },
  I: {
    0: {
      1: [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      3: [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
    },
    1: {
      0: [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
      2: [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
    },
    2: {
      1: [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
      3: [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
    },
    3: {
      2: [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      0: [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
    },
  },
};

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [400, 800, 1200, 1600];

const canMove = (board, shape, x, y) => {
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (shape[r][c]) {
        const nx = x + c;
        const ny = y + r;
        if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
    }
  }
  return true;
};

const merge = (board, shape, x, y, type) => {
  const newBoard = board.map((row) => row.slice());
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[r].length; c += 1) {
      if (shape[r][c]) newBoard[y + r][x + c] = type;
    }
  }
  return newBoard;
};

const defaultKeys = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  drop: 'Space',
  hold: 'Shift',
  pause: 'p',
  reset: 'r',
  sound: 'm',
  settings: 's',
};

const Tetris = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const isTouch = useIsTouchDevice();
  const canvasRef = useCanvasResize(WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);
  const boardContainerRef = useRef(null);
  const settingsRef = useRef(null);
  const generatorRef = useRef(new PieceGenerator());
  const [useBag, setUseBag] = usePersistentState(
    'tetris-use-bag',
    true,
    (value) => typeof value === 'boolean',
  );
  useEffect(() => {
    generatorRef.current.setMode(useBag ? 'seven-bag' : 'true-random');
  }, [useBag]);
  const getPiece = useCallback(
    () => createPiece(generatorRef.current.next()),
    []
  );
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(getPiece);
  const [pos, setPos] = useState({ x: Math.floor(WIDTH/2) - 2, y: 0 });
  const [next, setNext] = useState(() => [getPiece(), getPiece(), getPiece()]);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [highScore, setHighScore] = usePersistentState(
    'tetris-high-score',
    0,
    isFiniteNumber,
  );
  const [maxLevel, setMaxLevel] = usePersistentState(
    'tetris-max-level',
    1,
    isFiniteNumber,
  );
  const [keyBindings, setKeyBindings] = usePersistentState(
    'tetris-keys',
    defaultKeys,
    validateKeyBindings,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [paused, setPaused] = useState(false);
  const focusPausedRef = useRef(false);
  const [sound, setSound] = usePersistentState(
    'tetris-sound',
    true,
    (value) => typeof value === 'boolean',
  );
  const [tSpin, setTSpin] = useState('');
  const [mode, setMode] = useState('marathon');
  const sprintStartRef = useRef(null);
  const [sprintTime, setSprintTime] = useState(0);
  const [bestTime, setBestTime] = usePersistentState(
    'tetris-best-time',
    null,
    isNullableNumber,
  );
  const [finishTime, setFinishTime] = useState(null);

  const [clearAnimation, setClearAnimation] = useState(null);
  const clearInfoRef = useRef(null);
  const [celebration, setCelebration] = useState('');
  const [danger, setDanger] = useState(false);
  const [das, setDas] = usePersistentState('tetris-das', 150, isFiniteNumber);
  const [arr, setArr] = usePersistentState('tetris-arr', 50, isFiniteNumber);

  const [shake, setShake] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const reducedMotion = useRef(false);
  const [gameOver, setGameOver] = useState(false);
  const [bindingCapture, setBindingCapture] = useState(null);

  const isInputLocked = paused || !!clearAnimation || gameOver || showSettings;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = media.matches; };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const launchConfetti = useCallback((pieces = 100) => {
    if (reducedMotion.current) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.overflow = 'hidden';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);

    const duration = 2600;
    const maxDelay = 180;
    const piecesWithDelay = [];
    for (let i = 0; i < pieces; i += 1) {
      const confetto = document.createElement('div');
      const size = 4 + Math.random() * 5;
      const delay = Math.random() * maxDelay;
      confetto.style.position = 'absolute';
      confetto.style.width = `${size}px`;
      confetto.style.height = `${size}px`;
      confetto.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      confetto.style.top = '0px';
      confetto.style.left = `${Math.random() * 100}%`;
      confetto.style.opacity = '1';
      confetto.style.borderRadius = '2px';
      confetto.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      confetto.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
      confetto.style.transitionDelay = `${delay}ms`;
      confettiContainer.appendChild(confetto);
      piecesWithDelay.push(confetto);
    }

    requestAnimationFrame(() => {
      piecesWithDelay.forEach((element) => {
        const drift = (Math.random() - 0.5) * window.innerWidth * 0.6;
        const rotation = Math.random() * 720;
        element.style.transform = `translate3d(${drift}px, ${window.innerHeight + 100}px, 0) rotate(${rotation}deg)`;
        element.style.opacity = '0';
      });
    });

    setTimeout(() => {
      confettiContainer.remove();
    }, duration + maxDelay + 200);
  }, []);

  const softDropRef = useRef(false);
  const lockRef = useRef(null);
  const lastRotateRef = useRef(false);
  const dropCounter = useRef(0);
  const lastTime = useRef(0);
  const animationRef = useRef(null);
  const dasTimer = useRef({ left: null, right: null });
  const arrTimer = useRef({ left: null, right: null });
  const arrTimeRef = useRef({ left: 0, right: 0 });
  const keyHeld = useRef({ left: false, right: false });
  const padStateRef = useRef({
    leftStart: 0,
    leftRepeat: 0,
    rightStart: 0,
    rightRepeat: 0,
    downRepeat: 0,
    rotate: false,
    drop: false,
    hold: false,
    pause: false,
    reset: false,
  });

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const posRef = useRef(pos);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => {
    const top = board.findIndex((row) => row.some((c) => c));
    setDanger(top !== -1 && top < 4);
  }, [board]);

  useEffect(() => {
    setDas((current) => {
      const clamped = clampNumber(current, 50, 500);
      return clamped === current ? current : clamped;
    });
    setArr((current) => {
      const clamped = clampNumber(current, 10, 200);
      return clamped === current ? current : clamped;
    });
  }, [setArr, setDas]);

  useEffect(() => {
    if (showSettings) {
      settingsRef.current?.focus();
      keyHeld.current.left = false;
      keyHeld.current.right = false;
      softDropRef.current = false;
      ['left', 'right'].forEach((dir) => {
        if (dasTimer.current[dir]) {
          clearTimeout(dasTimer.current[dir]);
          dasTimer.current[dir] = null;
        }
        if (arrTimer.current[dir]) {
          cancelAnimationFrame(arrTimer.current[dir]);
          arrTimer.current[dir] = null;
          arrTimeRef.current[dir] = 0;
        }
      });
    } else {
      boardContainerRef.current?.focus();
    }
  }, [showSettings]);

  useEffect(() => {
    const update = () => {
      if (typeof navigator === 'undefined') return;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setGamepadConnected(pads.some((pad) => pad));
    };
    update();
    window.addEventListener('gamepadconnected', update);
    window.addEventListener('gamepaddisconnected', update);
    return () => {
      window.removeEventListener('gamepadconnected', update);
      window.removeEventListener('gamepaddisconnected', update);
    };
  }, []);

  const dropInterval = Math.max(100, 1000 - (level - 1) * 100);

  const audioCtxRef = useRef(null);
  const playSound = useCallback(
    (freq = 440, duration = 0.1) => {
      if (!sound) return;
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        /* ignore */
      }
    },
    [sound],
  );

  useEffect(
    () => () => {
      audioCtxRef.current?.close?.();
    },
    [],
  );

  const thud = useCallback(() => {
    playSound(120, 0.05);
    if (!reducedMotion.current) {
      setShake(true);
      setTimeout(() => setShake(false), 100);
    }
  }, [playSound]);

  const getDropY = useCallback((b = boardRef.current, sh = pieceRef.current.shape, x = posRef.current.x, y = posRef.current.y) => {
    let dy = y;
    while (canMove(b, sh, x, dy + 1)) dy += 1;
    return dy;
  }, []);

  const endSprint = useCallback(() => {
    const time = performance.now() - sprintStartRef.current;
    setFinishTime(time);
    if (!bestTime || time < bestTime) setBestTime(time);
    setPaused(true);
  }, [bestTime, setBestTime]);

  const resetGame = useCallback(
    (m = mode) => {
      setBoard(createBoard());
      generatorRef.current.setMode(useBag ? 'seven-bag' : 'true-random');
      setPiece(getPiece());
      setNext([getPiece(), getPiece(), getPiece()]);
      setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
      setScore(0);
      setLevel(1);
      setLines(0);
      setHold(null);
      setCanHold(true);
      setClearAnimation(null);
      clearInfoRef.current = null;
      setCombo(0);
      setCelebration('');
      setPaused(false);
      setGameOver(false);
      dropCounter.current = 0;
      softDropRef.current = false;
      if (lockRef.current) {
        clearTimeout(lockRef.current);
        lockRef.current = null;
      }
      if (m === 'sprint') {
        sprintStartRef.current = performance.now();
      } else {
        sprintStartRef.current = null;
      }
      setSprintTime(0);
      setFinishTime(null);
      setMode(m);
    },
    [getPiece, mode, useBag],
  );

  const isTSpin = useCallback((b, p, position) => {
    if (p.type !== 'T' || !lastRotateRef.current) return false;
    const corners = [
      [position.x, position.y],
      [position.x + 2, position.y],
      [position.x, position.y + 2],
      [position.x + 2, position.y + 2],
    ];
    let filled = 0;
    corners.forEach(([cx, cy]) => {
      if (cy < 0 || cy >= HEIGHT || cx < 0 || cx >= WIDTH || b[cy][cx]) filled += 1;
    });
    return filled >= 3;
  }, []);

  const finalizeClear = useCallback(() => {
    const info = clearInfoRef.current;
    if (!info) return;
    const { board: lockedBoard, lines: filled, gained, nextPiece, upcoming } = info;
    const compact = lockedBoard.filter((_, r) => !filled.includes(r));
    while (compact.length < HEIGHT) compact.unshift(Array(WIDTH).fill(0));
    setBoard(compact);
    setScore((s) => {
      const ns = s + gained;
      if (ns > highScore) setHighScore(ns);
      return ns;
    });
    setLines((l) => {
      const nl = l + filled.length;
      const nlvl = Math.floor(nl / 10) + 1;
      if (nlvl > level) {
        setLevel(nlvl);
        if (nlvl > maxLevel) setMaxLevel(nlvl);
      }
      if (mode === 'sprint' && nl >= 40) endSprint();
      return nl;
    });
    setCombo((c) => {
      const nc = c + 1;
      setMaxCombo((m) => Math.max(m, nc));
      return nc;
    });
    setPiece(nextPiece);
    setNext(upcoming);
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    setCanHold(true);
    lastRotateRef.current = false;
    clearInfoRef.current = null;
    dropCounter.current = 0;
    if (!canMove(compact, nextPiece.shape, Math.floor(WIDTH / 2) - 2, 0)) {
      setGameOver(true);
      setPaused(true);
    }
  }, [endSprint, highScore, level, maxLevel, mode, setHighScore, setMaxLevel]);

  const placePiece = useCallback((overridePos) => {
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const position = overridePos ?? posRef.current;
    const newBoard = merge(
      boardRef.current,
      pieceRef.current.shape,
      position.x,
      position.y,
      pieceRef.current.type,
    );
    thud();
    const filled = [];
    for (let r = 0; r < HEIGHT; r += 1) {
      if (newBoard[r].every((c) => c)) filled.push(r);
    }
    const tSpinFlag = isTSpin(newBoard, pieceRef.current, position);
    let gained = 0;
    if (tSpinFlag) {
      const msg = ['T-Spin', 'T-Spin Single', 'T-Spin Double', 'T-Spin Triple'][filled.length];
      setTSpin(msg);
      playSound(880, 0.2);
      gained = TSPIN_SCORES[filled.length];
      setTimeout(() => setTSpin(''), 1000);
    } else if (filled.length) {
      playSound();
      gained = LINE_SCORES[filled.length];
    }
    const [currentNext, ...restQueue] = next;
    const upcoming = [...restQueue, getPiece()];
    if (filled.length) {
      const isTetris = filled.length === 4 && !tSpinFlag;
      if (isTetris) {
        launchConfetti(200);
        setCelebration('TETRIS!');
        setTimeout(() => setCelebration(''), 1200);
      } else if (tSpinFlag) {
        launchConfetti(120);
      } else {
        launchConfetti(80);
      }
      setBoard(newBoard);
      clearInfoRef.current = {
        board: newBoard,
        lines: filled,
        gained,
        nextPiece: currentNext,
        upcoming,
      };
      dropCounter.current = 0;
      setClearAnimation({
        lines: filled,
        start: performance.now(),
        progress: 0,
        isTetris,
      });
    } else {
      setBoard(newBoard);
      setCombo(0);
      if (gained) {
        setScore((s) => {
          const ns = s + gained;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
      }
      setPiece(currentNext);
      setNext(upcoming);
      setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
      setCanHold(true);
      lastRotateRef.current = false;
      if (!canMove(newBoard, currentNext.shape, Math.floor(WIDTH / 2) - 2, 0)) {
        setGameOver(true);
        setPaused(true);
      }
    }
  }, [getPiece, highScore, isTSpin, launchConfetti, next, playSound, setHighScore, thud]);

  const moveDown = useCallback((soft = false) => {
    if (clearAnimation || gameOver || paused || showSettings) return;
    softDropRef.current = soft;
    if (canMove(boardRef.current, pieceRef.current.shape, posRef.current.x, posRef.current.y + 1)) {
      if (lockRef.current) {
        clearTimeout(lockRef.current);
        lockRef.current = null;
      }
      setPos((p) => ({ ...p, y: p.y + 1 }));
    } else if (!lockRef.current) {
      lockRef.current = setTimeout(() => {
        placePiece();
      }, 500);
    }
  }, [clearAnimation, gameOver, paused, placePiece, showSettings]);

  const move = useCallback((dir) => {
    if (clearAnimation || gameOver || paused || showSettings) return;
    const newX = posRef.current.x + dir;
    if (canMove(boardRef.current, pieceRef.current.shape, newX, posRef.current.y)) {
      setPos((p) => ({ ...p, x: newX }));
      if (lockRef.current) {
        clearTimeout(lockRef.current);
        lockRef.current = null;
      }
      if (!canMove(boardRef.current, pieceRef.current.shape, newX, posRef.current.y + 1)) {
        lockRef.current = setTimeout(() => {
          placePiece();
        }, 500);
      }
    }
    lastRotateRef.current = false;
  }, [clearAnimation, gameOver, paused, placePiece, showSettings]);

  const drawBlock = useCallback((ctx, x, y, color, options = {}) => {
    const { opacity = 1, shadow = true, padding = 0, outline = true } = options;
    const px = x * CELL_SIZE + padding;
    const py = y * CELL_SIZE + padding;
    const size = CELL_SIZE - padding * 2;
    const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
    gradient.addColorStop(0, adjustColor(color, 70));
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, adjustColor(color, -70));
    ctx.save();
    ctx.globalAlpha = opacity;
    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, size, size);
    if (outline) {
      ctx.strokeStyle = adjustColor(color, -100);
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
      ctx.strokeStyle = adjustColor(color, 100);
      ctx.beginPath();
      ctx.moveTo(px + 1, py + size - 1);
      ctx.lineTo(px + size - 1, py + size - 1);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const rotatePiece = useCallback(() => {
    if (clearAnimation || gameOver || paused || showSettings) return;
    const p = pieceRef.current;
    const from = p.rotation;
    const to = (p.rotation + 1) % 4;
    const rotated = rotate(p.shape);
    const table = p.type === 'O' ? { [to]: [[0, 0]] } : KICKS[p.type === 'I' ? 'I' : 'JLSTZ'];
    const kicks = table[from]?.[to] || [[0, 0]];
    for (const [dx, dy] of kicks) {
      const nx = posRef.current.x + dx;
      const ny = posRef.current.y + dy;
      if (canMove(boardRef.current, rotated, nx, ny)) {
        setPiece({ ...p, shape: rotated, rotation: to });
        setPos({ x: nx, y: ny });
        lastRotateRef.current = true;
        if (lockRef.current) {
          clearTimeout(lockRef.current);
          lockRef.current = null;
        }
        if (!canMove(boardRef.current, rotated, nx, ny + 1)) {
          lockRef.current = setTimeout(() => {
            placePiece();
          }, 500);
        }
        return;
      }
    }
  }, [clearAnimation, gameOver, paused, placePiece, showSettings]);

  const hardDrop = useCallback(() => {
    if (clearAnimation || gameOver || paused || showSettings) return;
    const y = getDropY();
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const distance = y - posRef.current.y;
    if (distance > 0) {
      setScore((s) => {
        const ns = s + distance * 2;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
    placePiece({ x: posRef.current.x, y });
    lastRotateRef.current = false;
  }, [clearAnimation, gameOver, getDropY, highScore, paused, placePiece, setHighScore, showSettings]);

  const holdPiece = useCallback(() => {
    if (!canHold || clearAnimation || gameOver || paused || showSettings) return;
    setCanHold(false);
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const current = createPiece(pieceRef.current.type);
    if (hold) {
      const temp = hold;
      setHold(current);
      setPiece(temp);
    } else {
      setHold(current);
      setPiece(next[0]);
      setNext([...next.slice(1), getPiece()]);
    }
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    lastRotateRef.current = false;
  }, [canHold, clearAnimation, gameOver, getPiece, hold, next, paused, showSettings]);

  const actionFromKey = useCallback(
    (key, code) => {
      const entry = Object.entries(keyBindings).find(
        ([, k]) =>
          k.toLowerCase() === key.toLowerCase() ||
          k.toLowerCase() === code.toLowerCase()
      );
      return entry ? entry[0] : null;
    },
    [keyBindings],
  );

  const togglePause = useCallback(() => {
    if (gameOver) return;
    setPaused((p) => !p);
  }, [gameOver, setPaused]);
  const toggleSound = useCallback(() => setSound((s) => !s), [setSound]);

  useEffect(() => {
    if (!isFocused && !paused && !gameOver) {
      focusPausedRef.current = true;
      setPaused(true);
      return;
    }
    if (isFocused && focusPausedRef.current) {
      focusPausedRef.current = false;
      setPaused(false);
    }
  }, [gameOver, isFocused, paused]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (showSettings) return;
      const action = actionFromKey(e.key, e.code);
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      if (action === 'left' || action === 'right') {
        if (isInputLocked) return;
        const dir = action === 'left' ? -1 : 1;
        move(dir);
        if (!keyHeld.current[action]) {
          keyHeld.current[action] = true;
          dasTimer.current[action] = setTimeout(() => {
            const step = (time) => {
              if (!keyHeld.current[action]) return;
              if (!arrTimeRef.current[action]) arrTimeRef.current[action] = time;
              if (time - arrTimeRef.current[action] >= arr) {
                move(dir);
                arrTimeRef.current[action] = time;
              }
              arrTimer.current[action] = requestAnimationFrame(step);
            };
            arrTimer.current[action] = requestAnimationFrame(step);
          }, das);
        }
      } else if (action === 'down') {
        if (isInputLocked) return;
        moveDown(true);
      } else if (action === 'rotate') {
        if (isInputLocked) return;
        rotatePiece();
      } else if (action === 'drop') {
        if (isInputLocked) return;
        hardDrop();
      } else if (action === 'hold') {
        if (isInputLocked) return;
        holdPiece();
      } else if (action === 'pause') {
        if (clearAnimation) return;
        togglePause();
      } else if (action === 'reset') {
        resetGame();
      } else if (action === 'sound') {
        toggleSound();
      } else if (action === 'settings') {
        setShowSettings(true);
      }
    },
    [actionFromKey, arr, clearAnimation, das, hardDrop, holdPiece, isInputLocked, move, moveDown, resetGame, rotatePiece, showSettings, togglePause, toggleSound, isFocused],
  );

  const handleKeyUp = useCallback(
    (e) => {
      if (!shouldHandleGameKey(e, { isFocused })) return;
      if (showSettings) return;
      const action = actionFromKey(e.key, e.code);
      if (!action) return;
      consumeGameKey(e);
      if (action === 'left' || action === 'right') {
        keyHeld.current[action] = false;
        if (dasTimer.current[action]) {
          clearTimeout(dasTimer.current[action]);
          dasTimer.current[action] = null;
        }
        if (arrTimer.current[action]) {
          cancelAnimationFrame(arrTimer.current[action]);
          arrTimer.current[action] = null;
          arrTimeRef.current[action] = 0;
        }
      } else if (action === 'down') {
        softDropRef.current = false;
      }
    },
    [actionFromKey, showSettings],
  );

  const handleTouchAction = useCallback(
    (action) => {
      if (clearAnimation || gameOver || paused || showSettings) return;
      if (action === 'left' || action === 'right') {
        if (isInputLocked) return;
        move(action === 'left' ? -1 : 1);
        return;
      }
      if (action === 'down') {
        if (isInputLocked) return;
        moveDown(true);
        return;
      }
      if (action === 'rotate') {
        if (isInputLocked) return;
        rotatePiece();
        return;
      }
      if (action === 'drop') {
        if (isInputLocked) return;
        hardDrop();
        return;
      }
      if (action === 'hold') {
        holdPiece();
        return;
      }
      if (action === 'pause') {
        togglePause();
      }
    },
    [clearAnimation, gameOver, hardDrop, holdPiece, isInputLocked, move, moveDown, paused, rotatePiece, showSettings, togglePause],
  );

  useEffect(() => () => {
    const dasTimers = dasTimer.current;
    const arrTimers = arrTimer.current;
    Object.values(dasTimers).forEach((t) => t && clearTimeout(t));
    Object.values(arrTimers).forEach((r) => r && cancelAnimationFrame(r));
  }, []);

  const animationStart = clearAnimation?.start ?? null;

  useEffect(() => {
    if (!clearAnimation || animationStart === null) return undefined;
    let frame;
    const duration = 320;
    const step = (time) => {
      const progress = Math.min((time - animationStart) / duration, 1);
      setClearAnimation((anim) => (anim ? { ...anim, progress } : null));
      if (progress >= 1) {
        finalizeClear();
        setClearAnimation(null);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animationStart, clearAnimation, finalizeClear]);

  const pollGamepad = useCallback(() => {
    if (typeof navigator === 'undefined') return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p) => p);
    const state = padStateRef.current;
    if (!pad) {
      state.leftStart = 0;
      state.leftRepeat = 0;
      state.rightStart = 0;
      state.rightRepeat = 0;
      state.downRepeat = 0;
      state.rotate = false;
      state.drop = false;
      state.hold = false;
      state.pause = false;
      state.reset = false;
      softDropRef.current = false;
      return;
    }
    const now = performance.now();
    const left = pad.axes[0] < -0.4 || pad.buttons[14]?.pressed;
    const right = pad.axes[0] > 0.4 || pad.buttons[15]?.pressed;
    const down = pad.axes[1] > 0.4 || pad.buttons[13]?.pressed;
    const pausePress = pad.buttons[9]?.pressed;
    if (pausePress && !state.pause) togglePause();
    state.pause = pausePress;

    const resetPress = pad.buttons[8]?.pressed;
    if (resetPress && !state.reset) resetGame();
    state.reset = resetPress;

    if (paused || clearAnimation || showSettings || gameOver) {
      state.leftStart = 0;
      state.leftRepeat = 0;
      state.rightStart = 0;
      state.rightRepeat = 0;
      state.downRepeat = 0;
      state.rotate = false;
      state.drop = false;
      state.hold = false;
      softDropRef.current = false;
      return;
    }
    if (left) {
      if (!state.leftStart) {
        move(-1);
        state.leftStart = now;
        state.leftRepeat = now;
      } else if (now - state.leftStart > das && now - state.leftRepeat > arr) {
        move(-1);
        state.leftRepeat = now;
      }
    } else {
      state.leftStart = 0;
      state.leftRepeat = 0;
    }
    if (right) {
      if (!state.rightStart) {
        move(1);
        state.rightStart = now;
        state.rightRepeat = now;
      } else if (now - state.rightStart > das && now - state.rightRepeat > arr) {
        move(1);
        state.rightRepeat = now;
      }
    } else {
      state.rightStart = 0;
      state.rightRepeat = 0;
    }
    if (down) {
      if (now - state.downRepeat > 70) {
        moveDown(true);
        state.downRepeat = now;
      }
    } else {
      state.downRepeat = 0;
      softDropRef.current = false;
    }
    const rotatePress = pad.buttons[0]?.pressed || pad.buttons[3]?.pressed || pad.buttons[5]?.pressed;
    if (rotatePress && !state.rotate) rotatePiece();
    state.rotate = rotatePress;

    const dropPress = pad.buttons[1]?.pressed || pad.buttons[7]?.pressed;
    if (dropPress && !state.drop) hardDrop();
    state.drop = dropPress;

    const holdPress = pad.buttons[2]?.pressed || pad.buttons[4]?.pressed;
    if (holdPress && !state.hold) holdPiece();
    state.hold = holdPress;

  }, [arr, clearAnimation, das, gameOver, hardDrop, holdPiece, move, moveDown, paused, resetGame, rotatePiece, showSettings, togglePause]);

  useEffect(() => {
    let raf;
    const loop = () => {
      pollGamepad();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pollGamepad]);

  const draw = useCallback(
    (ctx) => {
      ctx.clearRect(0, 0, WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);
      const bgGradient = ctx.createLinearGradient(0, 0, WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#111827');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      for (let x = 0; x <= WIDTH; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE + 0.5, 0);
        ctx.lineTo(x * CELL_SIZE + 0.5, HEIGHT * CELL_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= HEIGHT; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE + 0.5);
        ctx.lineTo(WIDTH * CELL_SIZE, y * CELL_SIZE + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      const progress = clearAnimation?.progress ?? 0;
      boardRef.current.forEach((row, y) => {
        const clearing = clearAnimation?.lines?.includes(y);
        const padding = clearing ? (CELL_SIZE / 2) * Math.pow(progress, 1.2) : 0;
        const opacity = clearing ? Math.max(0, 1 - progress) : 1;
        row.forEach((cell, x) => {
          if (cell) {
            drawBlock(ctx, x, y, TETROMINOS[cell].color, {
              opacity,
              padding,
              shadow: !clearing,
            });
          }
        });
        if (clearing) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 0.55 - progress * 0.55);
          const sweep = ctx.createLinearGradient(0, y * CELL_SIZE, WIDTH * CELL_SIZE, (y + 1) * CELL_SIZE);
          sweep.addColorStop(0, 'rgba(255,255,255,0)');
          sweep.addColorStop(0.5, 'rgba(255,255,255,0.8)');
          sweep.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sweep;
          ctx.fillRect(0, y * CELL_SIZE, WIDTH * CELL_SIZE, CELL_SIZE);
          ctx.restore();
        }
      });

      if (!clearAnimation) {
        const ghostY = getDropY();
        pieceRef.current.shape.forEach((row, r) => {
          row.forEach((c, col) => {
            if (c) {
              const gx = posRef.current.x + col;
              const gy = ghostY + r;
              drawBlock(ctx, gx, gy, pieceRef.current.color, {
                opacity: 0.2,
                shadow: false,
                outline: false,
              });
              ctx.save();
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = adjustColor(pieceRef.current.color, 80);
              ctx.globalAlpha = 0.6;
              ctx.strokeRect(gx * CELL_SIZE + 0.5, gy * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
              ctx.restore();
            }
          });
        });

        ctx.save();
        ctx.globalAlpha = 0.45;
        pieceRef.current.shape.forEach((row, r) => {
          row.forEach((c, col) => {
            if (c) {
              const px = (posRef.current.x + col) * CELL_SIZE;
              const py = (posRef.current.y + r) * CELL_SIZE;
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.beginPath();
              ctx.ellipse(px + CELL_SIZE / 2, py + CELL_SIZE, CELL_SIZE * 0.35, CELL_SIZE * 0.2, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });
        ctx.restore();

        pieceRef.current.shape.forEach((row, r) => {
          row.forEach((c, col) => {
            if (c) {
              drawBlock(
                ctx,
                posRef.current.x + col,
                posRef.current.y + r,
                pieceRef.current.color,
              );
            }
          });
        });
      }
    },
    [clearAnimation, drawBlock, getDropY],
  );

  const prettyKey = useCallback((key) => {
    if (!key) return '';
    const normalized = key.length === 1 ? key.toUpperCase() : key;
    const map = {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowDown: '↓',
      ArrowUp: '↑',
      Space: 'Space',
      ' ': 'Space',
      Shift: 'Shift',
      Control: 'Ctrl',
      Alt: 'Alt',
      Enter: 'Enter',
      Escape: 'Esc',
    };
    return map[normalized] || normalized.toUpperCase();
  }, []);

  const keyboardHints = useMemo(
    () => [
      { label: 'Move', keys: [keyBindings.left, keyBindings.right] },
      { label: 'Soft Drop', keys: [keyBindings.down] },
      { label: 'Hard Drop', keys: [keyBindings.drop] },
      { label: 'Rotate', keys: [keyBindings.rotate] },
      { label: 'Hold', keys: [keyBindings.hold] },
      { label: 'Pause', keys: [keyBindings.pause] },
    ],
    [keyBindings],
  );

  const touchControls = isTouch ? (
    <div className="mt-4 grid w-full max-w-xs grid-cols-3 gap-2 text-lg">
      <div />
      <button
        type="button"
        onPointerDown={() => handleTouchAction('rotate')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Rotate"
      >
        ⟳
      </button>
      <div />
      <button
        type="button"
        onPointerDown={() => handleTouchAction('left')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move left"
      >
        ←
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('down')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Soft drop"
      >
        ↓
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('right')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Move right"
      >
        →
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('hold')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Hold piece"
      >
        H
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('drop')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Hard drop"
      >
        ⤓
      </button>
      <button
        type="button"
        onPointerDown={() => handleTouchAction('pause')}
        className="rounded-xl bg-slate-800/80 px-4 py-3 shadow transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label={paused ? 'Resume' : 'Pause'}
      >
        {paused ? '▶' : 'Ⅱ'}
      </button>
    </div>
  ) : null;

  const bindingConflicts = useMemo(() => {
    const entries = Object.entries(keyBindings);
    const normalized = entries.map(([action, key]) => [action, key.toLowerCase()]);
    const counts = normalized.reduce((acc, [, key]) => {
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return entries.filter(([, key]) => counts[key.toLowerCase()] > 1);
  }, [keyBindings]);

  const captureBinding = useCallback((event, bindingKey) => {
    if (!bindingKey) return;
    event.preventDefault();
    const value = event.key === ' ' || event.code === 'Space'
      ? 'Space'
      : event.key.length === 1
        ? event.key.toLowerCase()
        : event.key;
    setKeyBindings((prev) => ({ ...prev, [bindingKey]: value }));
    setBindingCapture(null);
  }, [setKeyBindings]);

  const handleSettingsKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setBindingCapture(null);
      setShowSettings(false);
      return;
    }
    if (bindingCapture) {
      captureBinding(event, bindingCapture);
    }
  }, [bindingCapture, captureBinding, setShowSettings]);

  const gamepadHints = useMemo(
    () => [
      { label: 'Move', value: 'D-Pad / Left Stick' },
      { label: 'Soft Drop', value: 'Down / LS ↓' },
      { label: 'Hard Drop', value: 'B / RT' },
      { label: 'Rotate', value: 'A / Y / RB' },
      { label: 'Hold', value: 'X / LB' },
      { label: 'Pause', value: 'Start' },
    ],
    [],
  );

  const stats = useMemo(() => {
    const base = [
      { label: 'Score', value: score.toLocaleString() },
      { label: 'High', value: highScore.toLocaleString() },
      { label: 'Combo', value: combo > 0 ? `${combo}x` : '—' },
      { label: 'Max Combo', value: maxCombo > 0 ? `${maxCombo}x` : '—' },
      { label: 'Level', value: level },
      { label: 'Lines', value: mode === 'sprint' ? `${lines}/40` : lines },
    ];
    if (mode === 'sprint') {
      base.push(
        { label: 'Time', value: `${(sprintTime / 1000).toFixed(2)}s` },
        { label: 'Best', value: bestTime ? `${(bestTime / 1000).toFixed(2)}s` : '—' },
      );
    }
    return base;
  }, [bestTime, combo, highScore, level, lines, maxCombo, mode, score, sprintTime]);

  const sprintProgress = useMemo(
    () => (mode === 'sprint' ? Math.min(lines / 40, 1) : 0),
    [lines, mode],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return () => {};
    const loop = (time = 0) => {
      const delta = time - lastTime.current;
      lastTime.current = time;
      if (!paused && !gameOver) {
        if (mode === 'sprint' && sprintStartRef.current) {
          setSprintTime(time - sprintStartRef.current);
        }
        if (!clearAnimation) {
          dropCounter.current += delta;
          const interval = softDropRef.current ? dropInterval / 10 : dropInterval;
          if (dropCounter.current > interval) {
            moveDown(softDropRef.current);
            dropCounter.current = 0;
          }
        }
        draw(ctx);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [clearAnimation, draw, gameOver, moveDown, paused, dropInterval, mode]);

  const cellPreview = (p) => (
    p.shape.map((row, r) =>
      row.map((c, col) =>
        c ? (
          <div
            key={`${r}-${col}`}
            className="absolute h-4 w-4 rounded-sm border border-slate-900/60 shadow-[0_4px_10px_rgba(15,23,42,0.35)]"
            style={{
              top: r * CELL_SIZE,
              left: col * CELL_SIZE,
              backgroundImage: `linear-gradient(135deg, ${adjustColor(p.color, 70)}, ${adjustColor(p.color, -60)})`,
            }}
          />
        ) : null,
      ),
    )
  );

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="relative rounded-3xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-[0_25px_70px_rgba(15,23,42,0.65)]">
            <div
              className="relative mx-auto flex w-full max-w-[320px] aspect-[10/20] justify-center focus:outline-none"
              ref={boardContainerRef}
              tabIndex={0}
              role="application"
              aria-label="Tetris board. Click or focus to enable keyboard controls."
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onClick={() => boardContainerRef.current?.focus()}
            >
              <canvas
                ref={canvasRef}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/60 shadow-[0_20px_60px_rgba(15,23,42,0.7)] transition-transform duration-150"
                style={{ transform: shake ? 'translateY(2px)' : 'none' }}
                aria-label="Active Tetris board"
              />
              {danger && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl border border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.35)]" />
              )}
              {clearAnimation?.isTetris && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,#facc15_0%,rgba(250,204,21,0.0)_55%)]" />
              )}
              {celebration && (
                <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
                  <span className="rounded-full bg-amber-400/20 px-6 py-2 text-2xl font-semibold tracking-[0.2em] text-amber-100 shadow-lg backdrop-blur">
                    {celebration}
                  </span>
                </div>
              )}
              {tSpin && (
                <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
                  <span className="rounded-full bg-purple-500/20 px-4 py-2 text-xl font-semibold tracking-[0.2em] text-purple-100 shadow-lg backdrop-blur">
                    {tSpin}
                  </span>
                </div>
              )}
              {combo > 1 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
                  <span className="rounded-full bg-sky-500/20 px-4 py-1 text-sm font-semibold uppercase tracking-[0.4em] text-sky-200 shadow-lg backdrop-blur">
                    {combo}x Combo
                  </span>
                </div>
              )}
              {paused && finishTime === null && !gameOver && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-paused-title"
                >
                  <div className="w-full max-w-xs space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 text-center shadow-2xl">
                    <h3 id="tetris-paused-title" className="text-lg font-semibold uppercase tracking-[0.4em] text-sky-400">Paused</h3>
                    <div className="flex flex-col gap-2 text-sm">
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={togglePause}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => resetGame(mode)}
                      >
                        Restart
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={toggleSound}
                      >
                        {sound ? 'Mute Audio' : 'Enable Audio'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
                        onClick={() => setShowSettings(true)}
                      >
                        Control Settings
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Press {prettyKey(keyBindings.pause)} or Start to resume.</p>
                  </div>
                </div>
              )}
              {finishTime !== null && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-sprint-title"
                >
                  <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 text-center shadow-2xl">
                    <p id="tetris-sprint-title" className="text-xs uppercase tracking-[0.45em] text-sky-400">Sprint Complete</p>
                    <p className="text-3xl font-semibold text-white">
                      {(finishTime / 1000).toFixed(2)}s
                      {bestTime === finishTime ? ' • PB' : ''}
                    </p>
                    <button
                      type="button"
                      className="rounded-full border border-sky-500/60 bg-sky-500/20 px-4 py-2 font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white"
                      onClick={() => resetGame('sprint')}
                    >
                      Run it back
                    </button>
                  </div>
                </div>
              )}
              {gameOver && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-950/85 backdrop-blur"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="tetris-gameover-title"
                >
                  <div className="w-full max-w-sm space-y-4 rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 text-center shadow-2xl">
                    <p id="tetris-gameover-title" className="text-xs uppercase tracking-[0.45em] text-rose-400">Game Over</p>
                    <p className="text-3xl font-semibold text-white">{score.toLocaleString()}</p>
                    <div className="text-xs text-slate-300">
                      <p>Lines: {lines}</p>
                      <p>Level: {level}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-rose-500/60 bg-rose-500/20 px-4 py-2 font-semibold text-rose-200 transition hover:border-rose-400 hover:text-white"
                      onClick={() => resetGame(mode)}
                    >
                      Restart Run
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] uppercase tracking-[0.4em] text-slate-400">
              <span>{mode === 'sprint' ? 'Sprint 40 Lines' : 'Marathon Endless'}</span>
              <span>{sound ? 'Audio On' : 'Muted'}</span>
            </div>
            {mode === 'sprint' && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                  style={{ width: `${sprintProgress * 100}%` }}
                />
              </div>
            )}
            {touchControls}
          </div>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg" aria-labelledby="piece-queue">
              <h2 id="piece-queue" className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Piece Queue
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div aria-live="polite">
                  <p
                    id="hold-label"
                    className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500"
                  >
                    Hold
                  </p>
                  <div
                    className="relative h-20 w-20 rounded-xl border border-slate-800/70 bg-slate-950/60"
                    aria-labelledby="hold-label"
                  >
                    {hold ? (
                      <>
                        {cellPreview(hold)}
                        <span className="sr-only">Hold piece: {hold.type}</span>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-600">Empty</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Next</p>
                  <div className="space-y-2">
                    {next.map((p, i) => (
                      <div
                        key={`${p.type}-${i}`}
                        className="relative h-16 w-16 rounded-xl border border-slate-800/70 bg-slate-950/60"
                      >
                        {cellPreview(p)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg" aria-live="polite">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Mission Data</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {stats.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">{item.label}</dt>
                    <dd className="text-base font-semibold text-slate-100">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Controls</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Keyboard</p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {keyboardHints.map((hint) => (
                      <li key={hint.label} className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">{hint.label}</span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {hint.keys.map((key, index) => (
                            <kbd
                              key={`${hint.label}-${key || index}`}
                              className="rounded bg-slate-800/80 px-2 py-1 text-[0.65rem] font-semibold text-slate-100 shadow-[0_2px_6px_rgba(15,23,42,0.4)]"
                            >
                              {prettyKey(key)}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={gamepadConnected ? '' : 'opacity-60'}>
                  <p className="mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                    Gamepad
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${gamepadConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {gamepadConnected ? 'Connected' : 'Standby'}
                    </span>
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {gamepadHints.map((hint) => (
                      <li key={hint.label} className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">{hint.label}</span>
                        <span className="text-right font-semibold text-slate-100">{hint.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Operations</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={togglePause}
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={toggleSound}
                >
                  {sound ? 'Mute Audio' : 'Enable Audio'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => resetGame(mode)}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 font-semibold transition hover:text-white ${mode === 'marathon' ? 'border-sky-500/60 bg-sky-500/20 text-sky-200 hover:border-sky-400' : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-slate-500'}`}
                  onClick={() => resetGame('marathon')}
                >
                  Marathon
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 font-semibold transition hover:text-white ${mode === 'sprint' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200 hover:border-emerald-400' : 'border-slate-700 bg-slate-800/70 text-slate-100 hover:border-slate-500'}`}
                  onClick={() => resetGame('sprint')}
                >
                  Sprint 40
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                  onClick={() => setShowSettings(true)}
                >
                  Edit Controls
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">Audio cues, DAS, ARR, and bindings can be tuned without leaving your run.</p>
            </section>
          </aside>
        </div>
      </div>
      {showSettings && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tetris-settings-title"
          onKeyDown={handleSettingsKeyDown}
          tabIndex={-1}
          ref={settingsRef}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl">
            <h2 id="tetris-settings-title" className="mb-4 text-center text-lg font-semibold uppercase tracking-[0.4em] text-sky-400">
              Control Settings
            </h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
                <label htmlFor="bag-toggle">7-Bag</label>
                <input
                  id="bag-toggle"
                  type="checkbox"
                  checked={useBag}
                  onChange={(e) => setUseBag(e.target.checked)}
                  aria-label="Toggle seven-bag randomizer"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-slate-200">
                <label htmlFor="das-range">DAS {das}ms</label>
                <input
                  id="das-range"
                  type="range"
                  min="50"
                  max="500"
                  value={das}
                  onChange={(e) => setDas(Number(e.target.value))}
                  aria-label="Adjust DAS in milliseconds"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-slate-200">
                <label htmlFor="arr-range">ARR {arr}ms</label>
                <input
                  id="arr-range"
                  type="range"
                  min="10"
                  max="200"
                  value={arr}
                  onChange={(e) => setArr(Number(e.target.value))}
                  aria-label="Adjust ARR in milliseconds"
                />
              </div>
            </div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Key Bindings</h3>
            <p className="mb-3 text-xs text-slate-400">
              Select an action, then press a key to bind it. Press Esc to close settings.
            </p>
            {bindingConflicts.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                Duplicate bindings detected:
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {bindingConflicts.map(([action, key]) => (
                    <li key={`${action}-${key}`}>{action} ⇢ {prettyKey(key)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(keyBindings).map((k) => {
                const isCapturing = bindingCapture === k;
                return (
                  <div key={k} className="flex flex-col gap-1 text-sm text-slate-200">
                    <span className="uppercase tracking-[0.3em] text-slate-500">
                      {k}
                    </span>
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 text-left text-slate-100 transition focus:outline-none ${isCapturing ? 'border-sky-500 bg-slate-800/80' : 'border-slate-700 bg-slate-800'}`}
                      aria-label={`Set ${k} key binding`}
                      onClick={() => setBindingCapture(k)}
                    >
                      {isCapturing ? 'Press a key…' : prettyKey(keyBindings[k])}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
                onClick={() => {
                  setBindingCapture(null);
                  setShowSettings(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tetris;
