import React, { useRef, useEffect, useState, useCallback } from 'react';

const ROWS = 6;
const COLS = 7;

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const ConnectFour = () => {
  const canvasRef = useRef(null);
  const dropRef = useRef(null);
  const boardRef = useRef(createBoard());
  const pausedRef = useRef(false);
  const soundRef = useRef(true);
  const hoverRef = useRef({ col: null, row: null });
  const reduceRef = useRef(false);
  const winLineRef = useRef(null);
  const animRef = useRef(null);

  const [, setBoardState] = useState(boardRef.current);
  const [current, setCurrent] = useState(1); // 1 red, 2 yellow
  const [winner, setWinner] = useState(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [announcement, setAnnouncement] = useState("Red's turn");
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connect-four-highscore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [scores, setScores] = useState({ red: 0, yellow: 0 });
  const highRef = useRef(0);
  const [difficulty, setDifficulty] = useState('medium');
  const depthMap = { easy: 2, medium: 4, hard: 6 };
  const [size, setSize] = useState(80);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    highRef.current = highScore;
    localStorage.setItem('connect-four-highscore', String(highScore));
  }, [highScore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => {
        reduceRef.current = mq.matches;
      };
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(pointer: coarse)');
      const update = () => setSize(mq.matches ? 100 : 80);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  useEffect(() => {
    if (winner) {
      setAnnouncement(winner === 'draw' ? 'Game ended in draw' : `${winner} wins`);
    } else {
      setAnnouncement(`${current === 1 ? 'Red' : 'Yellow'}'s turn`);
    }
  }, [current, winner]);

  const cancelAnim = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const reset = () => {
    cancelAnim();
    boardRef.current = createBoard();
    setBoardState(boardRef.current);
    setWinner(null);
    setCurrent(1);
    dropRef.current = null;
    winLineRef.current = null;
    setScores({ red: 0, yellow: 0 });
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);

  const beep = () => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = 400;
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1);
      osc.stop(ac.currentTime + 0.1);
    } catch (e) {
      // ignore
    }
  };

  const getAvailableRow = (col) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (boardRef.current[r][col] === 0) return r;
    }
    return null;
  };

  const handleClick = (e) => {
    if (winner || dropRef.current || pausedRef.current || current !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / size);
    if (col < 0 || col >= COLS) return;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (boardRef.current[r][col] === 0) {
        dropRef.current = {
          col,
          row: r,
          y: reduceRef.current ? r * size : -size,
          color: current,
          vel: 0,
        };
        setAnnouncement(
          `${current === 1 ? 'Red' : 'Yellow'} disc dropped in column ${col + 1}, row ${r + 1}`
        );
        break;
      }
    }
  };

  const handleMove = (e) => {
    if (winner || dropRef.current || pausedRef.current || current !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / size);
    if (col < 0 || col >= COLS) {
      hoverRef.current = { col: null, row: null };
      return;
    }
    const row = getAvailableRow(col);
    if (hoverRef.current.col !== col) {
      setAnnouncement(`Column ${col + 1}`);
    }
    hoverRef.current = { col, row };
  };

  const handleLeave = () => {
    hoverRef.current = { col: null, row: null };
  };

  const handleKeyDown = (e) => {
    if (winner || dropRef.current || pausedRef.current || current !== 1) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let col = hoverRef.current.col;
      if (col === null) col = 0;
      else
        col =
          (col + (e.key === 'ArrowRight' ? 1 : -1) + COLS) % COLS;
      const row = getAvailableRow(col);
      hoverRef.current = { col, row };
      setAnnouncement(`Column ${col + 1}`);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const col = hoverRef.current.col;
      if (col === null) return;
      const row = getAvailableRow(col);
      if (row === null) return;
      dropRef.current = {
        col,
        row,
        y: reduceRef.current ? row * size : -size,
        color: current,
        vel: 0,
      };
      setAnnouncement(
        `${current === 1 ? 'Red' : 'Yellow'} disc dropped in column ${col + 1}, row ${row + 1}`
      );
    }
  };

  const checkWin = (board, row, col, color) => {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of dirs) {
      const line = [[row, col]];
      for (let i = 1; i < 4; i++) {
        const r = row + dy * i;
        const c = col + dx * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
        line.push([r, c]);
      }
      for (let i = 1; i < 4; i++) {
        const r = row - dy * i;
        const c = col - dx * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
        line.unshift([r, c]);
      }
      if (line.length >= 4) return line;
    }
    return null;
  };

  const getValidCols = (board) => {
    const cols = [];
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) cols.push(c);
    return cols;
  };

  const dropPiece = (board, col, color) => {
    const newBoard = board.map((row) => row.slice());
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = color;
        return { board: newBoard, row: r };
      }
    }
    return { board: newBoard, row: null };
  };

  const hasWin = (board, color) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === color && checkWin(board, r, c, color)) return true;
      }
    }
    return false;
  };

  const evaluateWindow = (window, color) => {
    let score = 0;
    const opp = color === 1 ? 2 : 1;
    const countColor = window.filter((v) => v === color).length;
    const countOpp = window.filter((v) => v === opp).length;
    const countEmpty = window.filter((v) => v === 0).length;
    if (countColor === 4) score += 100;
    else if (countColor === 3 && countEmpty === 1) score += 5;
    else if (countColor === 2 && countEmpty === 2) score += 2;
    if (countOpp === 3 && countEmpty === 1) score -= 4;
    return score;
  };

  const scorePosition = (board, color) => {
    let score = 0;
    const center = Math.floor(COLS / 2);
    const centerCount = board.map((row) => row[center]).filter((c) => c === color).length;
    score += centerCount * 3;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
        score += evaluateWindow(window, color);
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
        score += evaluateWindow(window, color);
      }
    }
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
        score += evaluateWindow(window, color);
      }
    }
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
        score += evaluateWindow(window, color);
      }
    }
    return score;
  };

  const minimax = (board, depth, alpha, beta, maximizingPlayer) => {
    const valid = getValidCols(board);
    const terminal = hasWin(board, 1) || hasWin(board, 2) || valid.length === 0;
    if (depth === 0 || terminal) {
      if (terminal) {
        if (hasWin(board, 2)) return { col: null, score: 1000000 };
        if (hasWin(board, 1)) return { col: null, score: -1000000 };
        return { col: null, score: 0 };
      }
      return { col: null, score: scorePosition(board, 2) };
    }
    if (maximizingPlayer) {
      let value = -Infinity;
      let column = valid[Math.floor(Math.random() * valid.length)];
      for (const col of valid) {
        const { board: newBoard } = dropPiece(board, col, 2);
        const newScore = minimax(newBoard, depth - 1, alpha, beta, false).score;
        if (newScore > value) {
          value = newScore;
          column = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return { col: column, score: value };
    }
    let value = Infinity;
    let column = valid[Math.floor(Math.random() * valid.length)];
    for (const col of valid) {
      const { board: newBoard } = dropPiece(board, col, 1);
      const newScore = minimax(newBoard, depth - 1, alpha, beta, true).score;
      if (newScore < value) {
        value = newScore;
        column = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { col: column, score: value };
  };

  const makeAIMove = useCallback(() => {
    const depth = depthMap[difficulty];
    const board = boardRef.current.map((row) => row.slice());
    const { col } = minimax(board, depth, -Infinity, Infinity, true);
    if (col !== null && col !== undefined) {
      const row = getAvailableRow(col);
      if (row !== null) {
        dropRef.current = {
          col,
          row,
          y: reduceRef.current ? row * size : -size,
          color: 2,
          vel: 0,
        };
        setAnnouncement(`Yellow disc dropped in column ${col + 1}, row ${row + 1}`);
      }
    }
  }, [difficulty, size]);

  useEffect(() => {
    if (current === 2 && !winner && !dropRef.current && !pausedRef.current) {
      makeAIMove();
    }
  }, [current, winner, makeAIMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * size;
    canvas.height = ROWS * size;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * size + size / 2;
          const y = r * size + size / 2;
          ctx.beginPath();
          ctx.arc(x, y, size / 2 - 5, 0, Math.PI * 2);
          const cell = boardRef.current[r][c];
          ctx.fillStyle = cell === 1 ? '#ef4444' : cell === 2 ? '#facc15' : '#1e3a8a';
          ctx.fill();
        }
      }

      const hover = hoverRef.current;
      if (hover.col !== null) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(hover.col * size, 0, size, canvas.height);
      if (hover.row !== null && !dropRef.current && !pausedRef.current) {
          ctx.beginPath();
          ctx.arc(
            hover.col * size + size / 2,
            hover.row * size + size / 2,
            size / 2 - 5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle =
            current === 1 ? 'rgba(239,68,68,0.5)' : 'rgba(250,204,21,0.5)';
          ctx.fill();
      }
    }

      if (dropRef.current && !pausedRef.current) {
        const p = dropRef.current;
        const target = p.row * size;
        if (!reduceRef.current) {
          p.vel += 1.5;
          p.y += p.vel;
        } else {
          p.y = target;
        }
        if (p.y >= target) {
          p.y = target;
          boardRef.current[p.row][p.col] = p.color;
          setBoardState(boardRef.current.map((row) => row.slice()));
          const nextRow = getAvailableRow(p.col);
          hoverRef.current =
            nextRow === null ? { col: null, row: null } : { col: p.col, row: nextRow };
          dropRef.current = null;
          if (soundRef.current) beep();
          const winLine = checkWin(boardRef.current, p.row, p.col, p.color);
          if (winLine) {
            winLineRef.current = winLine;
            const winCol = p.color === 1 ? 'red' : 'yellow';
            setWinner(winCol);
            setScores((s) => {
              const next = { ...s, [winCol]: s[winCol] + 1 };
              const best = Math.max(next.red, next.yellow);
              if (best > highRef.current) setHighScore(best);
              return next;
            });
          } else if (boardRef.current[0].every((v) => v !== 0)) {
            winLineRef.current = null;
            setWinner('draw');
          } else {
            winLineRef.current = null;
            setCurrent((c) => (c === 1 ? 2 : 1));
          }
        } else {
          ctx.beginPath();
          ctx.arc(
            p.col * size + size / 2,
            p.y + size / 2,
            size / 2 - 5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = p.color === 1 ? '#ef4444' : '#facc15';
          ctx.fill();
        }
      }

      if (winner && winLineRef.current) {
        const color = winner === 'red' ? '#ef4444' : '#facc15';
        ctx.save();
        ctx.lineWidth = 8;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.lineCap = 'round';
        const line = winLineRef.current;
        const start = line[0];
        const end = line[line.length - 1];
        ctx.beginPath();
        ctx.moveTo(start[1] * size + size / 2, start[0] * size + size / 2);
        ctx.lineTo(end[1] * size + size / 2, end[0] * size + size / 2);
        ctx.stroke();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return cancelAnim;
  }, [current, winner, cancelAnim, size]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2 flex gap-4 items-center">
        <div>Red: {scores.red}</div>
        <div>Yellow: {scores.yellow}</div>
        <div>High: {highScore}</div>
        {winner && (
          <div className="capitalize">{winner === 'draw' ? 'Draw' : `${winner} wins`}</div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * size}
        height={ROWS * size}
        className="bg-blue-700 cursor-pointer"
        onClick={handleClick}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Connect Four board"
      />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="mt-4 flex gap-2 items-center">
        <select
          className="px-2 py-1 bg-gray-700 rounded"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
          Reset
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleSound}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
      </div>
    </div>
  );
};

export default ConnectFour;

