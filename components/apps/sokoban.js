import React, { useState, useEffect, useRef } from 'react';

const defaultLevels = [
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

const parseLevelsFromText = (text) => {
  return text
    .replace(/\r/g, '')
    .trim()
    .split(/\n\s*\n/)
    .map((lvl) => lvl.split('\n'));
};

const checkWin = (board) =>
  !board.some((row) => row.includes('.') || row.includes('+'));

const isWall = (cell) => cell === '#' || cell === undefined;

const detectDeadlock = (board) => {
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === '$') {
        const up = board[y - 1]?.[x];
        const down = board[y + 1]?.[x];
        const left = board[y]?.[x - 1];
        const right = board[y]?.[x + 1];
        if ((isWall(up) || isWall(down)) && (isWall(left) || isWall(right))) {
          return true;
        }
      }
    }
  }
  return false;
};

const validateLevel = (level) => {
  let players = 0,
    boxes = 0,
    goals = 0;
  for (const row of level) {
    for (const ch of row) {
      if (!'# .$*@+'.includes(ch)) return `Invalid char ${ch}`;
      if (ch === '@' || ch === '+') players++;
      if (ch === '$' || ch === '*') boxes++;
      if (ch === '.' || ch === '*' || ch === '+') goals++;
    }
  }
  if (players !== 1) return 'Level must have exactly one player';
  if (boxes === 0) return 'Level must have at least one box';
  if (boxes !== goals) return 'Boxes and goals must be equal';
  return true;
};

const serialize = (board, player) =>
  board.map((r) => r.join('')).join('\n') + `|${player.x},${player.y}`;

const attemptMove = (board, player, dx, dy) => {
  const x = player.x;
  const y = player.y;
  const target = board[y + dy]?.[x + dx];
  const beyond = board[y + 2 * dy]?.[x + 2 * dx];
  if (!target) return null;
  const newBoard = board.map((r) => r.slice());
  const newPlayer = { x, y };
  const replacePlayerTile = () => {
    newBoard[y][x] = newBoard[y][x] === '+' ? '.' : ' ';
  };
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
    } else return null;
  } else return null;
  return { board: newBoard, player: newPlayer };
};

const Sokoban = () => {
  const [levels, setLevels] = useState(defaultLevels);
  const [levelIndex, setLevelIndex] = useState(0);
  const [board, setBoard] = useState([]);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('');
  const [moveCount, setMoveCount] = useState(0);
  const [hint, setHint] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const undoStack = useRef([]);
  const initialState = useRef(null);

  useEffect(() => {
    if (!levels[levelIndex]) return;
    const { board: b, player: p } = parseLevel(levels[levelIndex]);
    setBoard(b);
    setPlayer(p);
    undoStack.current = [];
    initialState.current = { board: b.map((r) => r.slice()), player: { ...p } };
    setMessage('');
    setMoveCount(0);
    setHint('');
    containerRef.current?.focus();
  }, [levelIndex, levels]);

  const move = (dx, dy) => {
    const result = attemptMove(board, player, dx, dy);
    if (!result) return;
    undoStack.current.push({ board: board.map((r) => r.slice()), player: { ...player } });
    setBoard(result.board);
    setPlayer(result.player);
    setMoveCount((c) => c + 1);
    setHint('');

    if (detectDeadlock(result.board)) {
      setMessage('Deadlock!');
    } else if (checkWin(result.board)) {
      if (levelIndex < levels.length - 1) {
        setLevelIndex(levelIndex + 1);
      } else {
        setMessage('All levels complete!');
      }
    } else {
      setMessage('');
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
      setMoveCount((c) => (c > 0 ? c - 1 : 0));
      setMessage('');
      setHint('');
    }
  };

  const reset = () => {
    if (initialState.current) {
      setBoard(initialState.current.board.map((r) => r.slice()));
      setPlayer({ ...initialState.current.player });
      undoStack.current = [];
      setMessage('');
      setMoveCount(0);
      setHint('');
      containerRef.current?.focus();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseLevelsFromText(text);
      setLevels(parsed);
      setLevelIndex(0);
    };
    reader.readAsText(file);
  };

  const getHint = () => {
    setHint('...');
    const dirs = [
      { dx: 0, dy: -1, key: 'Up' },
      { dx: 0, dy: 1, key: 'Down' },
      { dx: -1, dy: 0, key: 'Left' },
      { dx: 1, dy: 0, key: 'Right' },
    ];
    const start = {
      board: board.map((r) => r.slice()),
      player: { ...player },
      path: [],
    };
    const queue = [start];
    const visited = new Set();

    const step = () => {
      let count = 0;
      const batch = 100;
      while (queue.length && count < batch) {
        const state = queue.shift();
        const key = serialize(state.board, state.player);
        if (visited.has(key)) {
          count++;
          continue;
        }
        visited.add(key);
        if (checkWin(state.board)) {
          setHint(state.path[0] ? state.path[0].key : '');
          return;
        }
        for (const dir of dirs) {
          const res = attemptMove(state.board, state.player, dir.dx, dir.dy);
          if (res) queue.push({ board: res.board, player: res.player, path: [...state.path, dir] });
        }
        count++;
      }
      if (queue.length) setTimeout(step, 0);
      else setHint('No hint');
    };

    setTimeout(step, 0);
  };

  const openEditor = () => {
    setEditorText(levels[levelIndex].join('\n'));
    setEditorVisible(true);
    setError('');
  };

  const applyEditor = () => {
    const lines = editorText.replace(/\r/g, '').split('\n');
    const valid = validateLevel(lines);
    if (valid !== true) {
      setError(valid);
      return;
    }
    const newLevels = [...levels];
    newLevels[levelIndex] = lines;
    setLevels(newLevels);
    setEditorVisible(false);
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
      <div className="mt-4 flex space-x-2 flex-wrap items-center justify-center">
        <span className="mr-2">Moves: {moveCount}</span>
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
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={getHint}
        >
          Hint
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={openEditor}
        >
          Edit
        </button>
        <input type="file" accept=".txt" onChange={handleFile} />
      </div>
      {hint && <div className="mt-2">Hint: {hint}</div>}
      {message && <div className="mt-2">{message}</div>}
      {editorVisible && (
        <div className="mt-4 w-full max-w-md flex flex-col items-center">
          <textarea
            className="w-full h-40 text-black p-2"
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
          />
          {error && <div className="text-red-400 mt-2">{error}</div>}
          <div className="mt-2 flex space-x-4">
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={applyEditor}
            >
              Apply
            </button>
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => setEditorVisible(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sokoban;

