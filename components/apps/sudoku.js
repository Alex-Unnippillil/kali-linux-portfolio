import React, { useState, useEffect, useRef } from 'react';
import { isValid } from './sudoku-dlx';

const SIZE = 9;
const range = (n) => Array.from({ length: n }, (_, i) => i);

const dailySeed = () => {
  const str = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

const getCandidates = (board, r, c) => {
  const cand = [];
  for (let n = 1; n <= SIZE; n++) if (isValid(board, r, c, n)) cand.push(n);
  return cand;
};

// IndexedDB helpers for saving progress
const openDB = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open('sudoku', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('games');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const idbGet = async (key) => {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('games', 'readonly');
    const store = tx.objectStore('games');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const idbSet = async (key, val) => {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('games', 'readwrite');
    const store = tx.objectStore('games');
    const req = store.put(val, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const idbDelete = async (key) => {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('games', 'readwrite');
    const store = tx.objectStore('games');
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

let workerRef = null;
const initWorker = () => {
  if (workerRef || typeof window === 'undefined') return;
  workerRef = new Worker(new URL('./sudoku.worker.ts', import.meta.url));
};

const callWorker = (msg) =>
  new Promise((resolve) => {
    initWorker();
    const worker = workerRef;
    const handler = (e) => {
      if (e.data.type === msg.type) {
        worker.removeEventListener('message', handler);
        resolve(e.data);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage(msg);
  });

const generateSudoku = async (difficulty = 'easy', seed = Date.now()) => {
  const { puzzle, solution } = await callWorker({ type: 'generate', difficulty, seed });
  return { puzzle, solution };
};

const Sudoku = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [useDaily, setUseDaily] = useState(true);
  const [seed, setSeed] = useState(useDaily ? dailySeed() : Date.now());
  const [{ puzzle, solution }, setGame] = useState({ puzzle: [], solution: [] });
  const [board, setBoard] = useState([]);
  const [notes, setNotes] = useState([]); // notes[r][c] = array of numbers
  const [noteMode, setNoteMode] = useState(false);
  const [autoNotes, setAutoNotes] = useState(false);
  const [errorMode, setErrorMode] = useState(true);
  const [hint, setHint] = useState('');
  const [hintCell, setHintCell] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    initWorker();
    return () => workerRef && workerRef.terminate();
  }, []);

  const startGame = async (seedValue) => {
    const { puzzle, solution } = await generateSudoku(difficulty, seedValue);
    setSeed(seedValue);
    setGame({ puzzle, solution });
    setBoard(puzzle.map((r) => r.slice()));
    setNotes(
      Array(SIZE)
        .fill(0)
        .map(() => Array(SIZE).fill(0).map(() => []))
    );
    setCompleted(false);
    setHint('');
    setHintCell(null);
    setTime(0);
    if (autoNotes) {
      const fresh = puzzle.map((r) => r.slice());
      applyAutoNotes(fresh);
    }
  };

  useEffect(() => {
    let mounted = true;
    idbGet('current').then((data) => {
      if (!mounted) return;
      if (data && data.puzzle) {
        setDifficulty(data.difficulty || 'easy');
        setUseDaily(data.useDaily ?? true);
        setSeed(data.seed);
        setGame({ puzzle: data.puzzle, solution: data.solution });
        setBoard(data.board);
        setNotes(data.notes);
        setTime(data.time || 0);
      } else {
        const s = useDaily ? dailySeed() : Date.now();
        startGame(s);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (board.length === 0) return;
    idbSet('current', {
      difficulty,
      useDaily,
      seed,
      puzzle,
      solution,
      board,
      notes,
      time,
    });
  }, [board, notes, time, puzzle, solution, difficulty, seed, useDaily]);

  useEffect(() => {
    if (completed) {
      clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [completed, puzzle]);

  const handleValue = (r, c, value) => {
    if (!puzzle[r] || puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.slice());
    const newNotes = notes.map((row) => row.map((n) => n.slice()));
    if (noteMode) {
      if (v >= 1 && v <= 9) {
        if (!newNotes[r][c].includes(v)) newNotes[r][c].push(v);
        else newNotes[r][c] = newNotes[r][c].filter((n) => n !== v);
      }
    } else {
      newBoard[r][c] = !v || v < 1 || v > 9 ? 0 : v;
      newNotes[r][c] = [];
    }
    setBoard(newBoard);
    setNotes(newNotes);
    if (autoNotes) applyAutoNotes(newBoard);
    if (newBoard.flat().every((n, i) => n === solution[Math.floor(i / 9)][i % 9])) {
      setCompleted(true);
      idbDelete('current');
    }
  };

  const applyAutoNotes = (b = board) => {
    const newNotes = Array(SIZE)
      .fill(0)
      .map(() => Array(SIZE).fill(0).map(() => []));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) newNotes[r][c] = getCandidates(b, r, c);
      }
    }
    setNotes(newNotes);
  };

  const getHintHandler = async () => {
    const { hint: h } = await callWorker({ type: 'hint', board });
    if (h) {
      setHint(`Cell (${h.r + 1},${h.c + 1}) must be ${h.val} (${h.reason})`);
      setHintCell({ r: h.r, c: h.c });
    } else {
      setHint('No hints available');
      setHintCell(null);
    }
  };

  const hasConflict = (b, r, c, val) => {
    if (val === 0) return false;
    for (let i = 0; i < SIZE; i++) {
      if (i !== c && b[r][i] === val) return true;
      if (i !== r && b[i][c] === val) return true;
    }
    const boxRow = Math.floor(r / 3) * 3;
    const boxCol = Math.floor(c / 3) * 3;
    for (let rr = 0; rr < 3; rr++) {
      for (let cc = 0; cc < 3; cc++) {
        const nr = boxRow + rr;
        const nc = boxCol + cc;
        if ((nr !== r || nc !== c) && b[nr][nc] === val) return true;
      }
    }
    return false;
  };

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-panel text-white">
        Loading...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-panel text-white p-4 select-none overflow-y-auto">
      <div className="mb-2 flex space-x-2">
        <select
          className="text-black p-1"
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            startGame(useDaily ? dailySeed() : Date.now());
          }}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={noteMode} onChange={(e) => setNoteMode(e.target.checked)} />
          <span>Notes</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={autoNotes}
            onChange={(e) => {
              setAutoNotes(e.target.checked);
              if (e.target.checked) applyAutoNotes();
            }}
          />
          <span>Auto</span>
        </label>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={errorMode} onChange={(e) => setErrorMode(e.target.checked)} />
          <span>Errors</span>
        </label>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={getHintHandler}>
          Hint
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => startGame(useDaily ? dailySeed() : Date.now())}
        >
          New Game
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => {
            setUseDaily(!useDaily);
            startGame(!useDaily ? dailySeed() : Date.now());
          }}
        >
          {useDaily ? 'Daily' : 'Random'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => {
            const s = parseInt(prompt('Enter seed'), 10);
            if (!Number.isNaN(s)) startGame(s);
          }}
        >
          Use Seed
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => navigator.clipboard.writeText(String(seed))}
        >
          Copy Seed
        </button>
      </div>
      <div className="mb-2">Time: {Math.floor(time / 60)}:{('0' + (time % 60)).slice(-2)} | Seed: {seed}</div>
      <div className="grid grid-cols-9" style={{ gap: '2px' }} role="grid">
        {board.map((row, r) =>
          row.map((val, c) => {
            const original = puzzle[r][c] !== 0;
            const conflict = errorMode && hasConflict(board, r, c, val);
            const isHint = hintCell && hintCell.r === r && hintCell.c === c;
            return (
              <div
                key={`${r}-${c}`}
                role="gridcell"
                className={`relative w-8 h-8 sm:w-10 sm:h-10 ${
                  original ? 'bg-gray-300' : 'bg-white'
                } ${conflict ? 'bg-red-300' : ''} ${isHint ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <input
                  className="w-full h-full text-center text-black outline-none"
                  aria-label={`Row ${r + 1} Column ${c + 1}`}
                  aria-readonly={original}
                  value={val === 0 ? '' : val}
                  onChange={(e) => handleValue(r, c, e.target.value)}
                  maxLength={1}
                  disabled={original}
                  inputMode="numeric"
                />
                {notes[r][c].length > 0 && val === 0 && (
                  <div className="absolute inset-0 grid grid-cols-3 text-[8px] leading-3 text-gray-500 pointer-events-none">
                    {range(9).map((n) => (
                      <div key={n} className="flex items-center justify-center">
                        {notes[r][c].includes(n + 1) ? n + 1 : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {completed && (
        <div className="mt-2" aria-live="polite">
          Completed!
        </div>
      )}
      {hint && (
      <div className="mt-2 text-yellow-300" aria-live="polite">{hint}</div>
      )}
    </div>
  );
};

export default Sudoku;

