import React, { useState, useEffect, useCallback } from 'react';
import usePersistentState from '../usePersistentState';

const WIDTH = 10;
const HEIGHT = 20;
const CELL_SIZE = 16; // px

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-400' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-400' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500' },
};
const PIECES = Object.keys(TETROMINOS);

const createBoard = () =>
  Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

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

const randomPiece = () => {
  const type = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { ...TETROMINOS[type], type };
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
  const [piece, setPiece] = useState(randomPiece);
  const [pos, setPos] = useState({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
  const [next, setNext] = useState(randomPiece);
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [highScore, setHighScore] = usePersistentState('tetris-high-score', 0);
  const [maxLevel, setMaxLevel] = usePersistentState('tetris-max-level', 1);
  const [keyBindings, setKeyBindings] = usePersistentState('tetris-keys', defaultKeys);
  const [showSettings, setShowSettings] = useState(false);
  const [softDrop, setSoftDrop] = useState(false);

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
    setPiece(randomPiece());
    setNext(randomPiece());
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    setScore(0);
    setLevel(1);
    setLines(0);
    setHold(null);
  }, []);

  const placePiece = useCallback(() => {
    const newBoard = merge(board, piece.shape, pos.x, pos.y, piece.type);
    const filled = [];
    for (let r = 0; r < HEIGHT; r += 1) {
      if (newBoard[r].every((c) => c)) filled.push(r);
    }
    if (filled.length) {
      // Animate clearing
      setBoard((b) =>
        b.map((row, r) => (filled.includes(r) ? row.map(() => 'clearing') : row))
      );
      setTimeout(() => {
        const compact = newBoard.filter((_, r) => !filled.includes(r));
        while (compact.length < HEIGHT) compact.unshift(Array(WIDTH).fill(0));
        setBoard(compact);
      }, 300);
      const gained = filled.length * 100;
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
    }
    setPiece(next);
    setNext(randomPiece());
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
    setCanHold(true);
    if (!canMove(newBoard, next.shape, Math.floor(WIDTH / 2) - 2, 0)) {
      resetGame();
    }
  }, [board, piece, pos, next, resetGame, highScore, level, maxLevel]);

  const moveDown = useCallback(
    (soft = false) => {
      setSoftDrop(soft);
      if (canMove(board, piece.shape, pos.x, pos.y + 1)) {
        setPos((p) => ({ ...p, y: p.y + 1 }));
      } else {
        placePiece();
      }
    },
    [board, piece, pos, placePiece]
  );

  useEffect(() => {
    const id = setInterval(() => moveDown(), dropInterval);
    return () => clearInterval(id);
  }, [moveDown, dropInterval]);

  const move = (dir) => {
    const newX = pos.x + dir;
    if (canMove(board, piece.shape, newX, pos.y)) setPos((p) => ({ ...p, x: newX }));
  };

  const rotatePiece = () => {
    const rotated = rotate(piece.shape);
    if (canMove(board, rotated, pos.x, pos.y)) setPiece({ ...piece, shape: rotated });
  };

  const hardDrop = () => {
    const y = getDropY();
    setPos((p) => ({ ...p, y }));
    placePiece();
  };

  const holdPiece = () => {
    if (!canHold) return;
    setCanHold(false);
    if (hold) {
      const temp = hold;
      setHold(piece);
      setPiece(temp);
    } else {
      setHold(piece);
      setPiece(next);
      setNext(randomPiece());
    }
    setPos({ x: Math.floor(WIDTH / 2) - 2, y: 0 });
  };

  const actionFromKey = (key) => {
    const entry = Object.entries(keyBindings).find(([, k]) => k.toLowerCase() === key.toLowerCase());
    return entry ? entry[0] : null;
  };

  const handleKey = useCallback(
    (e) => {
      const action = actionFromKey(e.key.length === 1 ? e.key : e.code);
      if (!action) return;
      e.preventDefault();
      if (action === 'left') move(-1);
      else if (action === 'right') move(1);
      else if (action === 'down') moveDown(true);
      else if (action === 'rotate') rotatePiece();
      else if (action === 'drop') hardDrop();
      else if (action === 'hold') holdPiece();
      else if (action === 'settings') setShowSettings((s) => !s);
    },
    [keyBindings, moveDown]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

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
