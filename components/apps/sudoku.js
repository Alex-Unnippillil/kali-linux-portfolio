import React, { useEffect, useRef, useState } from 'react';

// Board constants
const SIZE = 9;
const CELL = 40; // px
const BOARD = SIZE * CELL;

const range = (n) => Array.from({ length: n }, (_, i) => i);

// Simple seeded RNG so puzzles can be deterministic
const createRNG = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const isValid = (board, row, col, num) => {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
};

// Backtracking solver used for generation
const solveBoard = (board, idx = 0, rng = Math.random) => {
  if (idx === SIZE * SIZE) return true;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return solveBoard(board, idx + 1, rng);
  const nums = shuffle(
    range(SIZE).map((n) => n + 1),
    typeof rng === 'function' ? rng : Math.random,
  );
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (solveBoard(board, idx + 1, rng)) return true;
      board[row][col] = 0;
    }
  }
  return false;
};

const countSolutions = (board, idx = 0, limit = 2) => {
  if (idx === SIZE * SIZE) return 1;
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  if (board[row][col] !== 0) return countSolutions(board, idx + 1, limit);
  let count = 0;
  for (let num = 1; num <= SIZE && count < limit; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, idx + 1, limit - count);
      board[row][col] = 0;
    }
  }
  return count;
};

const getCandidates = (board, r, c) => {
  const cand = [];
  for (let n = 1; n <= SIZE; n++) if (isValid(board, r, c, n)) cand.push(n);
  return cand;
};

const generateSudoku = (difficulty = 'easy', seed = Date.now()) => {
  const rng = createRNG(seed);
  const board = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));
  solveBoard(board, 0, rng);
  const solution = board.map((row) => row.slice());
  const puzzle = board.map((row) => row.slice());
  const holesByDiff = { easy: 35, medium: 45, hard: 55 };
  let holes = holesByDiff[difficulty] || holesByDiff.easy;
  const positions = shuffle(range(SIZE * SIZE), rng);
  for (const pos of positions) {
    if (holes === 0) break;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const copy = puzzle.map((row) => row.slice());
    if (countSolutions(copy) !== 1) {
      puzzle[r][c] = backup;
    } else {
      holes--;
    }
  }
  return { puzzle, solution };
};

const Sudoku = () => {
  const canvasRef = useRef(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [puzzle, setPuzzle] = useState([]);
  const [solution, setSolution] = useState([]);
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(true);
  const [time, setTime] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [sound, setSound] = useState(true);

  const boardRef = useRef(board);
  const selectedRef = useRef(selected);
  const runningRef = useRef(running);

  const beep = () => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 600;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      /* ignore */
    }
  };

  const startGame = () => {
    const { puzzle, solution } = generateSudoku(difficulty);
    setPuzzle(puzzle);
    setSolution(solution);
    setBoard(puzzle.map((r) => r.slice()));
    setSelected(null);
    setTime(0);
    setRunning(true);
    const stored =
      typeof window !== 'undefined'
        ? localStorage.getItem(`sudoku-best-${difficulty}`)
        : null;
    setBestTime(stored ? parseInt(stored, 10) : null);
  };

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let last = performance.now();

    const draw = () => {
      const now = performance.now();
      if (runningRef.current) {
        setTime((t) => t + (now - last) / 1000);
      }
      last = now;

      ctx.clearRect(0, 0, BOARD, BOARD);
      for (let i = 0; i <= SIZE; i++) {
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, BOARD);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(BOARD, i * CELL);
        ctx.stroke();
      }

      if (selectedRef.current) {
        ctx.fillStyle = 'rgba(255,255,0,0.3)';
        ctx.fillRect(
          selectedRef.current.c * CELL,
          selectedRef.current.r * CELL,
          CELL,
          CELL,
        );
      }

      ctx.font = `${CELL * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const val = boardRef.current[r][c];
          if (val) {
            const original = puzzle[r][c] !== 0;
            const conflict = val !== solution[r][c];
            ctx.fillStyle = conflict
              ? 'red'
              : original
              ? 'gray'
              : 'black';
            ctx.fillText(val, c * CELL + CELL / 2, r * CELL + CELL / 2);
          }
        }
      }

      if (!runningRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, BOARD, BOARD);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Paused', BOARD / 2, BOARD / 2);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClick = (e) => {
    if (!running) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      setSelected({ r, c });
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (!selectedRef.current || !runningRef.current) return;
      if (e.key >= '1' && e.key <= '9') {
        const { r, c } = selectedRef.current;
        if (puzzle[r][c] !== 0) return;
        const newBoard = boardRef.current.map((row) => row.slice());
        newBoard[r][c] = parseInt(e.key, 10);
        setBoard(newBoard);
        beep();
        if (isComplete(newBoard)) {
          setRunning(false);
          const finalTime = Math.floor(time);
          if (typeof window !== 'undefined') {
            const key = `sudoku-best-${difficulty}`;
            const stored = localStorage.getItem(key);
            if (!stored || finalTime < parseInt(stored, 10)) {
              localStorage.setItem(key, finalTime.toString());
              setBestTime(finalTime);
            }
          }
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const { r, c } = selectedRef.current;
        if (puzzle[r][c] !== 0) return;
        const newBoard = boardRef.current.map((row) => row.slice());
        newBoard[r][c] = 0;
        setBoard(newBoard);
      } else if (e.key === 'p') {
        setRunning((r) => !r);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [puzzle, difficulty, time]);

  const isComplete = (b) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  };

  const provideHint = () => {
    if (!running) return;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) {
          const cand = getCandidates(board, r, c);
          if (cand.length === 1) {
            const newBoard = board.map((row) => row.slice());
            newBoard[r][c] = cand[0];
            setBoard(newBoard);
            return;
          }
        }
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) {
          const newBoard = board.map((row) => row.slice());
          newBoard[r][c] = solution[r][c];
          setBoard(newBoard);
          return;
        }
      }
    }
  };

  const resetGame = () => {
    setBoard(puzzle.map((r) => r.slice()));
    setSelected(null);
    setTime(0);
    setRunning(true);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-2 select-none overflow-y-auto">
      <div className="mb-2 flex space-x-2">
        <select
          className="text-black p-1"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={provideHint}>
          Hint
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={resetGame}>
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound:On' : 'Sound:Off'}
        </button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={startGame}>
          New
        </button>
      </div>
      <div className="mb-2">
        Time: {Math.floor(time / 60)}:{('0' + Math.floor(time % 60)).slice(-2)}
        {bestTime !== null && (
          <span className="ml-2 text-sm text-gray-300">
            Best: {Math.floor(bestTime / 60)}:{('0' + (bestTime % 60)).slice(-2)}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={BOARD}
        height={BOARD}
        className="bg-white cursor-pointer"
        onClick={handleClick}
      />
    </div>
  );
};

export default Sudoku;

