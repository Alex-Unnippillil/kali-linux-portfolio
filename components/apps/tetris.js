import React, { useState, useEffect, useRef, useCallback } from 'react';
import usePersistentState from '../usePersistentState';

const WIDTH = 10;
const HEIGHT = 20;
const CELL_SIZE = 16;

const TETROMINOS = {
  I: { shape: [[1,1,1,1]], color: '#06b6d4' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f97316' },
  O: { shape: [[1,1],[1,1]], color: '#eab308' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#22c55e' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ef4444' },
};
const PIECES = Object.keys(TETROMINOS);

const createBoard = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

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

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

let bag = [];
const bagPiece = () => {
  if (bag.length === 0) bag = shuffle([...PIECES]);
  const type = bag.pop();
  return { ...TETROMINOS[type], type };
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

const Tetris = () => {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(bagPiece);
  const [pos, setPos] = useState({ x: Math.floor(WIDTH/2) - 2, y: 0 });
  const [next, setNext] = useState(bagPiece);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [highScore, setHighScore] = usePersistentState('tetris-high-score', 0);
  const [maxLevel, setMaxLevel] = usePersistentState('tetris-max-level', 1);
  const [keyBindings, setKeyBindings] = usePersistentState('tetris-keys', defaultKeys);
  const [showSettings, setShowSettings] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = usePersistentState('tetris-sound', true);
  const [tSpin, setTSpin] = useState(false);

  const softDropRef = useRef(false);
  const lockRef = useRef(null);
  const lastRotateRef = useRef(false);
  const dropCounter = useRef(0);
  const lastTime = useRef(0);
  const animationRef = useRef(null);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const posRef = useRef(pos);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const dropInterval = Math.max(100, 1000 - (level - 1) * 100);

  const playSound = useCallback((freq = 440, duration = 0.1) => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* ignore */
    }
  }, [sound]);

  const getDropY = useCallback((b = boardRef.current, sh = pieceRef.current.shape, x = posRef.current.x, y = posRef.current.y) => {
    let dy = y;
    while (canMove(b, sh, x, dy + 1)) dy += 1;
    return dy;
  }, []);

  const resetGame = useCallback(() => {
    setBoard(createBoard());
    bag = [];
    setPiece(bagPiece());
    setNext(bagPiece());
    setPos({ x: Math.floor(WIDTH/2) - 2, y: 0 });
    setScore(0);
    setLevel(1);
    setLines(0);
    setHold(null);
    setCanHold(true);
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
  }, []);

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

  const placePiece = useCallback(() => {
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const newBoard = merge(boardRef.current, pieceRef.current.shape, posRef.current.x, posRef.current.y, pieceRef.current.type);
    const filled = [];
    for (let r = 0; r < HEIGHT; r += 1) {
      if (newBoard[r].every((c) => c)) filled.push(r);
    }
    let tSpinScore = 0;
    if (isTSpin(newBoard, pieceRef.current, posRef.current)) {
      setTSpin(true);
      playSound(880, 0.2);
      tSpinScore = 400;
      setTimeout(() => setTSpin(false), 1000);
    }
    if (filled.length) {
      playSound();
      const compact = newBoard.filter((_, r) => !filled.includes(r));
      while (compact.length < HEIGHT) compact.unshift(Array(WIDTH).fill(0));
      setBoard(compact);
      const gained = filled.length * 100 + tSpinScore;
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
        return nl;
      });
    } else {
      setBoard(newBoard);
      if (tSpinScore) {
        setScore((s) => {
          const ns = s + tSpinScore;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
      }
    }
    setPiece(next);
    setNext(bagPiece());
    setPos({ x: Math.floor(WIDTH/2) - 2, y: 0 });
    setCanHold(true);
    lastRotateRef.current = false;
    if (!canMove(newBoard, next.shape, Math.floor(WIDTH/2) - 2, 0)) {
      resetGame();
    }
  }, [highScore, isTSpin, level, maxLevel, next, playSound, resetGame, setHighScore, setMaxLevel]);

  const moveDown = useCallback((soft = false) => {
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
  }, [placePiece]);

  const move = useCallback((dir) => {
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
  }, [placePiece]);

  const rotatePiece = useCallback(() => {
    const rotated = rotate(pieceRef.current.shape);
    if (canMove(boardRef.current, rotated, posRef.current.x, posRef.current.y)) {
      setPiece({ ...pieceRef.current, shape: rotated });
      lastRotateRef.current = true;
      if (lockRef.current) {
        clearTimeout(lockRef.current);
        lockRef.current = null;
      }
      if (!canMove(boardRef.current, rotated, posRef.current.x, posRef.current.y + 1)) {
        lockRef.current = setTimeout(() => {
          placePiece();
        }, 500);
      }
    }
  }, [placePiece]);

  const hardDrop = useCallback(() => {
    const y = getDropY();
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    setPos((p) => ({ ...p, y }));
    placePiece();
    lastRotateRef.current = false;
  }, [getDropY, placePiece]);

  const holdPiece = useCallback(() => {
    if (!canHold) return;
    setCanHold(false);
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    if (hold) {
      const temp = hold;
      setHold(pieceRef.current);
      setPiece(temp);
    } else {
      setHold(pieceRef.current);
      setPiece(next);
      setNext(bagPiece());
    }
    setPos({ x: Math.floor(WIDTH/2) - 2, y: 0 });
    lastRotateRef.current = false;
  }, [canHold, hold, next]);

  const actionFromKey = useCallback((key) => {
    const entry = Object.entries(keyBindings).find(([, k]) => k.toLowerCase() === key.toLowerCase());
    return entry ? entry[0] : null;
  }, [keyBindings]);

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);

  const handleKey = useCallback((e) => {
    const action = actionFromKey(e.key.length === 1 ? e.key : e.code);
    if (!action) return;
    e.preventDefault();
    if (action === 'left') move(-1);
    else if (action === 'right') move(1);
    else if (action === 'down') moveDown(true);
    else if (action === 'rotate') rotatePiece();
    else if (action === 'drop') hardDrop();
    else if (action === 'hold') holdPiece();
    else if (action === 'pause') togglePause();
    else if (action === 'reset') resetGame();
    else if (action === 'sound') toggleSound();
    else if (action === 'settings') setShowSettings((s) => !s);
  }, [actionFromKey, hardDrop, holdPiece, move, moveDown, rotatePiece, resetGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const draw = useCallback((ctx) => {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);
    boardRef.current.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = TETROMINOS[cell].color;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#111827';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
    const ghostY = getDropY();
    ctx.globalAlpha = 0.3;
    pieceRef.current.shape.forEach((row, r) => {
      row.forEach((c, col) => {
        if (c) {
          ctx.fillStyle = pieceRef.current.color;
          ctx.fillRect((posRef.current.x + col) * CELL_SIZE, (ghostY + r) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
    ctx.globalAlpha = 1;
    pieceRef.current.shape.forEach((row, r) => {
      row.forEach((c, col) => {
        if (c) {
          ctx.fillStyle = pieceRef.current.color;
          ctx.fillRect((posRef.current.x + col) * CELL_SIZE, (posRef.current.y + r) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#111827';
          ctx.strokeRect((posRef.current.x + col) * CELL_SIZE, (posRef.current.y + r) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
  }, [getDropY]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const loop = (time = 0) => {
      const delta = time - lastTime.current;
      lastTime.current = time;
      if (!paused) {
        dropCounter.current += delta;
        const interval = softDropRef.current ? dropInterval / 10 : dropInterval;
        if (dropCounter.current > interval) {
          moveDown(softDropRef.current);
          dropCounter.current = 0;
        }
        draw(ctx);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw, moveDown, paused, dropInterval]);

  const cellPreview = (p) => (
    p.shape.map((row, r) =>
      row.map((c, col) =>
        c ? (
          <div
            key={`${r}-${col}`}
            className="absolute w-4 h-4 border border-gray-700"
            style={{ top: r * CELL_SIZE, left: col * CELL_SIZE, backgroundColor: p.color }}
          />
        ) : null,
      ),
    )
  );

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white relative">
      <div className="flex space-x-4">
        <canvas
          ref={canvasRef}
          width={WIDTH * CELL_SIZE}
          height={HEIGHT * CELL_SIZE}
          className="border border-gray-700"
        />
        <div className="flex flex-col text-sm">
          <div className="mb-4">
            <div className="text-center mb-1">Hold</div>
            <div className="relative border border-gray-700" style={{ width: 4 * CELL_SIZE, height: 4 * CELL_SIZE }}>
              {hold && cellPreview(hold)}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-center mb-1">Next</div>
            <div className="relative border border-gray-700" style={{ width: 4 * CELL_SIZE, height: 4 * CELL_SIZE }}>
              {cellPreview(next)}
            </div>
          </div>
          <div>Score: {score}</div>
          <div>High: {highScore}</div>
          <div>Level: {level}</div>
          <div>Lines: {lines}</div>
          <div className="mt-2 space-x-1">
            <button className="px-2 py-1 bg-blue-500" onClick={resetGame}>Reset</button>
            <button className="px-2 py-1 bg-blue-500" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</button>
            <button className="px-2 py-1 bg-blue-500" onClick={toggleSound}>{sound ? 'Sound On' : 'Sound Off'}</button>
          </div>
        </div>
      </div>
      {tSpin && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-4xl">T-Spin!</div>}
      {paused && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-4xl">Paused</div>}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="mb-2 text-center">Key Bindings</h2>
            {Object.keys(keyBindings).map((k) => (
              <div key={k} className="flex items-center mb-2">
                <label className="w-24 capitalize">{k}</label>
                <input
                  className="text-black px-1"
                  value={keyBindings[k]}
                  onChange={(e) => setKeyBindings({ ...keyBindings, [k]: e.target.value })}
                />
              </div>
            ))}
            <button className="mt-2 px-2 py-1 bg-blue-500" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tetris;

