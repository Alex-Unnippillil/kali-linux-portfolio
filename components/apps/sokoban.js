import React, { useState, useEffect, useRef } from 'react';

const levels = [
  [
    '#####',
    '#@$.#',
    '#####',
  ],
  [
    '######',
    '# .. #',
    '# $$ #',
    '#  @ #',
    '######',
  ],
];

const parseLevel = (level) => {
  const board = level.map((row) => row.split(''));
  let player = { x: 0, y: 0 };
  board.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell === '@' || cell === '+') player = { x, y };
    })
  );
  return { board, player };
};

const checkWin = (board) =>
  !board.some((row) => row.includes('.') || row.includes('+'));

const Sokoban = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [board, setBoard] = useState([]);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('');
  const containerRef = useRef(null);
  const undoStack = useRef([]);
  const initialState = useRef(null);

  useEffect(() => {
    const { board: b, player: p } = parseLevel(levels[levelIndex]);
    setBoard(b);
    setPlayer(p);
    undoStack.current = [];
    initialState.current = { board: b.map((r) => r.slice()), player: { ...p } };
    setMessage('');
    containerRef.current?.focus();
  }, [levelIndex]);

  const move = (dx, dy) => {
    const x = player.x;
    const y = player.y;
    const target = board[y + dy]?.[x + dx];
    const beyond = board[y + 2 * dy]?.[x + 2 * dx];
    if (!target) return;

    const prevBoard = board.map((r) => r.slice());
    const newBoard = board.map((r) => r.slice());

    const replacePlayerTile = () => {
      newBoard[y][x] = newBoard[y][x] === '+' ? '.' : ' ';
    };

    if (target === ' ' || target === '.') {
      replacePlayerTile();
      newBoard[y + dy][x + dx] = target === '.' ? '+' : '@';
      undoStack.current.push({ board: prevBoard, player: { ...player } });
      setBoard(newBoard);
      setPlayer({ x: x + dx, y: y + dy });
    } else if (target === '$' || target === '*') {
      if (beyond === ' ' || beyond === '.') {
        replacePlayerTile();
        newBoard[y + dy][x + dx] = target === '*' ? '+' : '@';
        newBoard[y + 2 * dy][x + 2 * dx] = beyond === '.' ? '*' : '$';
        undoStack.current.push({ board: prevBoard, player: { ...player } });
        setBoard(newBoard);
        setPlayer({ x: x + dx, y: y + dy });
      }
    }

    if (checkWin(newBoard)) {
      if (levelIndex < levels.length - 1) {
        setLevelIndex(levelIndex + 1);
      } else {
        setMessage('All levels complete!');
      }
    }
  };

  const handleKeyDown = (e) => {
    const dir = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
    }[e.key];
    if (dir) {
      e.preventDefault();
      move(dir[0], dir[1]);
    }
  };

  const undo = () => {
    const last = undoStack.current.pop();
    if (last) {
      setBoard(last.board.map((r) => r.slice()));
      setPlayer({ ...last.player });
    }
  };

  const reset = () => {
    if (initialState.current) {
      setBoard(initialState.current.board.map((r) => r.slice()));
      setPlayer({ ...initialState.current.player });
      undoStack.current = [];
      setMessage('');
      containerRef.current?.focus();
    }
  };

  const renderCell = (cell, idx) => {
    switch (cell) {
      case '#':
        return <div key={idx} className="w-8 h-8 bg-gray-700" />;
      case '.':
        return <div key={idx} className="w-8 h-8 bg-gray-500" />;
      case '$':
        return (
          <div key={idx} className="w-8 h-8 flex items-center justify-center">
            📦
          </div>
        );
      case '*':
        return (
          <div
            key={idx}
            className="w-8 h-8 bg-gray-500 flex items-center justify-center"
          >
            📦
          </div>
        );
      case '@':
        return (
          <div key={idx} className="w-8 h-8 flex items-center justify-center">
            🙂
          </div>
        );
      case '+':
        return (
          <div
            key={idx}
            className="w-8 h-8 bg-gray-500 flex items-center justify-center"
          >
            🙂
          </div>
        );
      default:
        return <div key={idx} className="w-8 h-8" />;
    }
  };

  const width = board[0]?.length || 0;

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${width}, 32px)` }}
      >
        {board.map((row, y) =>
          row.map((cell, x) => renderCell(cell, `${y}-${x}`))
        )}
      </div>
      <div className="mt-4 flex space-x-4">
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={undo}
        >
          Undo
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
      </div>
      {message && <div className="mt-2">{message}</div>}
    </div>
  );
};

export default Sokoban;

