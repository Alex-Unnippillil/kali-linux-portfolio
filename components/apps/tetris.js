import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePersistentState from '../usePersistentState';
import { checkTSpin } from '../../utils/tetris';

const WIDTH = 10;
const HEIGHT = 20;
const CELL_SIZE = 16; // px

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());

const getRotations = (shape) => {
  const rotations = [];
  let current = shape;
  for (let i = 0; i < 4; i += 1) {
    rotations.push(current);
    current = rotate(current);
  }
  return rotations;
};

const TETROMINOS = {
  I: {
    rotations: getRotations([
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]),
    color: 'bg-cyan-400',
  },
  J: {
    rotations: getRotations([
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ]),
    color: 'bg-blue-500',
  },
  L: {
    rotations: getRotations([
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ]),
    color: 'bg-orange-400',
  },
  O: {
    rotations: [[[1, 1], [1, 1]]],
    color: 'bg-yellow-400',
  },
  S: {
    rotations: getRotations([
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ]),
    color: 'bg-green-400',
  },
  T: {
    rotations: getRotations([
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ]),
    color: 'bg-purple-500',
  },
  Z: {
    rotations: getRotations([
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ]),
    color: 'bg-red-500',
  },
};
const PIECES = Object.keys(TETROMINOS);

const createBoard = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

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
      if (shape[r][c]) newBoard[y + r][x + c] = type || 1;
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
  const { rotations, color } = TETROMINOS[type];
  return { type, rotations, color, rot: 0, shape: rotations[0] };
};

const KICKS_NORMAL = {
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
      [1, 0],
      [1, 1],
      [0, -2],
      [1, -2],
    ],
    3: [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
  },
  3: {
    0: [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    2: [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
  },
};

const KICKS_I = {
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
    0: [
      [0, 0],
      [1, 0],
      [-2, 0],
      [1, -2],
      [-2, 1],
    ],
    2: [
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, -1],
      [1, 2],
    ],
  },
};

const defaultKeys = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  down: 'ArrowDown',
  rotate: 'ArrowUp',
  drop: 'Space',
  hold: 'Shift',
  settings: 's',
};

const Tetris = () => {
  const [board, setBoard] = useState(createBoard);
  const [piece, setPiece] = useState(bagPiece);
  const [pos, setPos] = useState({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
  const [next, setNext] = useState(bagPiece);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [highScore, setHighScore] = usePersistentState('tetris-high-score', 0);
  const [maxLevel, setMaxLevel] = usePersistentState('tetris-max-level', 1);
  const [keyBindings, setKeyBindings] = usePersistentState('tetris-keys', defaultKeys);
  const [das, setDas] = usePersistentState('tetris-das', 150);
  const [arr, setArr] = usePersistentState('tetris-arr', 50);
  const [showSettings, setShowSettings] = useState(false);
  const [softDrop, setSoftDrop] = useState(false);
  const [lastRotate, setLastRotate] = useState(false);
  const [lockStart, setLockStart] = useState(null);
  const [lockElapsed, setLockElapsed] = useState(0);
  const lockRef = useRef(null);
  const moveRef = useRef({ dir: 0, das: null, arr: null });
  const LOCK_DELAY = 500;

  const dropInterval = Math.max(100, 1000 - (level - 1) * 100);

  const getDropY = useCallback(
    (b = board, sh = piece.shape, x = pos.x, y = pos.y) => {
      let dy = y;
      while (canMove(b, sh, x, dy + 1)) dy += 1;
      return dy;
    },
    [board, piece, pos]
  );

  const resetGame = useCallback(() => {
    setBoard(createBoard());
    bag = [];
    setPiece(bagPiece());
    setNext(bagPiece());
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
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

  const clearLock = useCallback(() => {
    if (lockRef.current) {
      clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    setLockStart(null);
  }, []);

  const startLock = useCallback(() => {
    setLockStart(Date.now());
    lockRef.current = setTimeout(() => {
      placePiece();
    }, LOCK_DELAY);
  }, [placePiece]);

  const placePiece = useCallback(() => {
    clearLock();
    const merged = merge(board, piece.shape, pos.x, pos.y, piece.type);
    const tSpin = checkTSpin(merged, piece, pos, lastRotate);
    const filled = [];
    for (let r = 0; r < HEIGHT; r += 1) {
      if (merged[r].every((c) => c)) filled.push(r);
    }
    if (filled.length) {
      setBoard((b) =>
        b.map((row, r) => (filled.includes(r) ? row.map(() => 'clearing') : row))
      );
      setTimeout(() => {
        const compact = merged.filter((_, r) => !filled.includes(r));
        while (compact.length < HEIGHT) compact.unshift(Array(WIDTH).fill(0));
        setBoard(compact);
      }, 300);
      let gained = filled.length * 100;
      if (tSpin) gained += 400;
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
      setBoard(merged);
      if (tSpin) {
        setScore((s) => {
          const ns = s + 400;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
      }
    }
    setPiece(next);
    setNext(bagPiece());
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    setCanHold(true);
    setLastRotate(false);
    if (!canMove(merged, next.shape, Math.floor(WIDTH / 2) - 2, 0)) {
      resetGame();
    }
  }, [board, piece, pos, next, resetGame, highScore, level, maxLevel, setHighScore, setMaxLevel, clearLock, lastRotate]);

  const moveDown = useCallback(
    (soft = false) => {
      setSoftDrop(soft);
      setLastRotate(false);
      if (canMove(board, piece.shape, pos.x, pos.y + 1)) {
        clearLock();
        setPos((p) => ({ ...p, y: p.y + 1 }));
      } else if (!lockRef.current) {
        startLock();
      }
    },
    [board, piece, pos, startLock, clearLock]
  );

  useEffect(() => {
    const id = setInterval(() => moveDown(), dropInterval);
    return () => clearInterval(id);
  }, [moveDown, dropInterval]);

  useEffect(() => {
    if (lockStart !== null) {
      setLockElapsed(Date.now() - lockStart);
      const id = setInterval(() => setLockElapsed(Date.now() - lockStart), 16);
      return () => clearInterval(id);
    }
    setLockElapsed(0);
  }, [lockStart]);

  const move = useCallback(
    (dir) => {
      const newX = pos.x + dir;
      if (canMove(board, piece.shape, newX, pos.y)) {
        setPos((p) => ({ ...p, x: newX }));
        clearLock();
        if (!canMove(board, piece.shape, newX, pos.y + 1)) {
          startLock();
        }
      }
      setLastRotate(false);
    },
    [board, piece, pos, startLock, clearLock]
  );

  const startMove = useCallback(
    (dir) => {
      move(dir);
      moveRef.current.dir = dir;
      moveRef.current.das = setTimeout(() => {
        moveRef.current.arr = setInterval(() => move(dir), arr);
      }, das);
    },
    [move, das, arr]
  );

  const stopMove = useCallback(() => {
    if (moveRef.current.das) clearTimeout(moveRef.current.das);
    if (moveRef.current.arr) clearInterval(moveRef.current.arr);
    moveRef.current = { dir: 0, das: null, arr: null };
  }, []);

  const rotatePiece = useCallback(
    (dir = 1) => {
      const newRot = (piece.rot + dir + 4) % 4;
      const rotated = piece.rotations[newRot];
      const kicks = (piece.type === 'I' ? KICKS_I : KICKS_NORMAL)[piece.rot][newRot];
      for (const [dx, dy] of kicks) {
        if (canMove(board, rotated, pos.x + dx, pos.y + dy)) {
          setPiece({ ...piece, rot: newRot, shape: rotated });
          setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
          clearLock();
          if (!canMove(board, rotated, pos.x + dx, pos.y + dy + 1)) {
            startLock();
          }
          setLastRotate(true);
          return;
        }
      }
    },
    [board, piece, pos, startLock, clearLock]
  );

  const hardDrop = useCallback(() => {
    const y = getDropY();
    clearLock();
    setPos((p) => ({ ...p, y }));
    setLastRotate(false);
    placePiece();
  }, [getDropY, placePiece, clearLock]);

  const holdPiece = useCallback(() => {
    if (!canHold) return;
    setCanHold(false);
    clearLock();
    if (hold) {
      const temp = hold;
      setHold(piece);
      setPiece(temp);
    } else {
      setHold(piece);
      setPiece(next);
      setNext(bagPiece());
    }
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    setLastRotate(false);
  }, [canHold, hold, next, piece, clearLock]);

  const actionFromKey = useCallback(
    (key) => {
      const entry = Object.entries(keyBindings).find(([, k]) => k.toLowerCase() === key.toLowerCase());
      return entry ? entry[0] : null;
    },
    [keyBindings]
  );

  const handleKeyDown = useCallback(
    (e) => {
      const action = actionFromKey(e.key.length === 1 ? e.key : e.code);
      if (!action) return;
      e.preventDefault();
      if (action === 'left') {
        if (moveRef.current.dir !== -1) {
          stopMove();
          startMove(-1);
        }
      } else if (action === 'right') {
        if (moveRef.current.dir !== 1) {
          stopMove();
          startMove(1);
        }
      } else if (action === 'down') moveDown(true);
      else if (action === 'rotate') rotatePiece();
      else if (action === 'drop') hardDrop();
      else if (action === 'hold') holdPiece();
      else if (action === 'settings') setShowSettings((s) => !s);
    },
    [actionFromKey, hardDrop, holdPiece, moveDown, rotatePiece, setShowSettings, startMove, stopMove]
  );

  const handleKeyUp = useCallback(
    (e) => {
      const action = actionFromKey(e.key.length === 1 ? e.key : e.code);
      if (!action) return;
      if (action === 'left' && moveRef.current.dir === -1) stopMove();
      else if (action === 'right' && moveRef.current.dir === 1) stopMove();
      else if (action === 'down') setSoftDrop(false);
    },
    [actionFromKey, stopMove]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const ghostY = getDropY();

  const cellClass = (cell) => {
    if (cell === 0) return 'bg-ub-cool-grey';
    if (cell === 'clearing') return 'bg-blue-500 opacity-0 transition-opacity duration-300';
    return TETROMINOS[cell].color;
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white relative">
      <div className="flex space-x-4">
        <div
          className="relative border border-gray-700"
          style={{ width: WIDTH * CELL_SIZE, height: HEIGHT * CELL_SIZE }}
        >
          {board.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`absolute w-4 h-4 border border-gray-700 ${cellClass(cell)}`}
                style={{ top: y * CELL_SIZE, left: x * CELL_SIZE }}
              />
            ))
          )}
          {piece.shape.map((row, r) =>
            row.map((c, col) =>
              c ? (
                <div
                  key={`g-${r}-${col}`}
                  className="absolute w-4 h-4 border border-gray-700 opacity-30"
                  style={{ top: (ghostY + r) * CELL_SIZE, left: (pos.x + col) * CELL_SIZE }}
                />
              ) : null
            )
          )}
          {piece.shape.map((row, r) =>
            row.map((c, col) =>
              c ? (
                <div
                  key={`p-${r}-${col}`}
                  className={`absolute w-4 h-4 border border-gray-700 ${piece.color} transition-all`}
                  style={{
                    top: (pos.y + r) * CELL_SIZE,
                    left: (pos.x + col) * CELL_SIZE,
                    transition: `top ${softDrop ? '50ms' : '100ms'} linear`,
                  }}
                />
              ) : null
            )
          )}
          {lockStart !== null && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-red-500"
              style={{ width: `${Math.min(100, (lockElapsed / LOCK_DELAY) * 100)}%` }}
            />
          )}
        </div>
        <div className="flex flex-col text-sm">
          <div className="mb-4">
            <div className="text-center mb-1">Hold</div>
            <div
              className="relative border border-gray-700"
              style={{ width: 4 * CELL_SIZE, height: 4 * CELL_SIZE }}
            >
              {hold &&
                hold.shape.map((row, r) =>
                  row.map((c, col) =>
                    c ? (
                      <div
                        key={`h-${r}-${col}`}
                        className={`absolute w-4 h-4 border border-gray-700 ${hold.color}`}
                        style={{ top: r * CELL_SIZE, left: col * CELL_SIZE }}
                      />
                    ) : null
                  )
                )}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-center mb-1">Next</div>
            <div
              className="relative border border-gray-700"
              style={{ width: 4 * CELL_SIZE, height: 4 * CELL_SIZE }}
            >
              {next.shape.map((row, r) =>
                row.map((c, col) =>
                  c ? (
                    <div
                      key={`n-${r}-${col}`}
                      className={`absolute w-4 h-4 border border-gray-700 ${next.color}`}
                      style={{ top: r * CELL_SIZE, left: col * CELL_SIZE }}
                    />
                  ) : null
                )
              )}
            </div>
          </div>
          <div>Score: {score}</div>
          <div>High: {highScore}</div>
          <div>Level: {level}</div>
          <div>Max Level: {maxLevel}</div>
        </div>
      </div>
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
                  onChange={(e) =>
                    setKeyBindings({ ...keyBindings, [k]: e.target.value })
                  }
                />
              </div>
            ))}
            <div className="flex items-center mb-2">
              <label className="w-24">DAS</label>
              <input
                type="number"
                className="text-black px-1"
                value={das}
                onChange={(e) => setDas(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center mb-2">
              <label className="w-24">ARR</label>
              <input
                type="number"
                className="text-black px-1"
                value={arr}
                onChange={(e) => setArr(Number(e.target.value))}
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
    </div>
  );
};

export default Tetris;
