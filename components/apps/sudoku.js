import {
  SIZE,
  generateSudoku,
  dailySeed,
  getCandidates,
  range,
} from './sudoku-utils';
import React, { useState, useEffect, useRef } from 'react';

const Sudoku = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [useDaily, setUseDaily] = useState(true);
  const [puzzle, setPuzzle] = useState([]);
  const [board, setBoard] = useState([]);
  const [notes, setNotes] = useState([]); // notes[r][c] = array of numbers
  const [noteMode, setNoteMode] = useState(false);
  const [autoNotes, setAutoNotes] = useState(false);
  const [hint, setHint] = useState('');
  const [hintCell, setHintCell] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [time, setTime] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const timerRef = useRef(null);
  const workerRef = useRef(null);

  const startGame = (seed) => {
    if (!workerRef.current) return;
    workerRef.current.onmessage = (e) => {
      const { puzzle: newPuzzle } = e.data;
      if (!newPuzzle) return;
      setPuzzle(newPuzzle);
      setBoard(newPuzzle.map((r) => r.slice()));
      setNotes(
        Array(SIZE)
          .fill(0)
          .map(() => Array(SIZE).fill(0).map(() => []))
      );
      setCompleted(false);
      setHint('');
      setHintCell(null);
      setTime(0);
      setBestTime(() => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(`sudoku-best-${difficulty}`);
        return stored ? parseInt(stored, 10) : null;
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sudoku-progress');
      }
      if (autoNotes) {
        const fresh = newPuzzle.map((r) => r.slice());
        applyAutoNotes(fresh);
      }
    };
    workerRef.current.postMessage({
      type: 'generate',
      difficulty,
      seed,
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker(new URL('../../workers/solverWorker.ts', import.meta.url));
      const saved = localStorage.getItem('sudoku-progress');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setDifficulty(data.difficulty || 'easy');
          setUseDaily(data.useDaily ?? true);
          setPuzzle(data.puzzle);
          setBoard(data.board);
          setNotes(data.notes);
          setCompleted(data.completed);
          setTime(data.time || 0);
          const stored = localStorage.getItem(
            `sudoku-best-${data.difficulty || 'easy'}`,
          );
          setBestTime(stored ? parseInt(stored, 10) : null);
          return () => workerRef.current?.terminate();
        } catch (e) {
          // ignore malformed storage
        }
      }
    }
    startGame(useDaily ? dailySeed() : Date.now());
    return () => workerRef.current?.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed) {
      clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [completed, puzzle]);

  useEffect(() => {
    if (typeof window === 'undefined' || puzzle.length === 0) return;
    const data = {
      puzzle,
      board,
      notes,
      difficulty,
      useDaily,
      time,
      completed,
    };
    localStorage.setItem('sudoku-progress', JSON.stringify(data));
  }, [board, notes, time, puzzle, difficulty, useDaily, completed]);

  useEffect(() => {
    if (!completed || typeof window === 'undefined') return;
    const key = `sudoku-best-${difficulty}`;
    const stored = localStorage.getItem(key);
    if (!stored || time < parseInt(stored, 10)) {
      localStorage.setItem(key, time.toString());
      setBestTime(time);
    }
    localStorage.removeItem('sudoku-progress');
  }, [completed, time, difficulty]);

  const handleValue = (r, c, value, forceNote = false) => {
    if (!puzzle[r] || puzzle[r][c] !== 0) return;
    const v = parseInt(value, 10);
    const newBoard = board.map((row) => row.slice());
    const newNotes = notes.map((row) => row.map((n) => n.slice()));
    if (noteMode || forceNote) {
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
    if (isBoardComplete(newBoard)) {
      setCompleted(true);
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

  const getHintHandler = () => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) {
          const cand = getCandidates(board, r, c);
          if (cand.length === 1) {
            setHint(`Cell (${r + 1},${c + 1}) must be ${cand[0]} (single candidate)`);
            setHintCell({ r, c });
            return;
          }
        }
      }
    }
    setHint('No simple hints available');
    setHintCell(null);
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

  const isBoardComplete = (b) => {
    for (let r = 0; r < SIZE; r++) {
      const row = b[r];
      if (row.includes(0) || new Set(row).size !== SIZE) return false;
    }
    for (let c = 0; c < SIZE; c++) {
      const col = [];
      for (let r = 0; r < SIZE; r++) col.push(b[r][c]);
      if (col.includes(0) || new Set(col).size !== SIZE) return false;
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            box.push(b[br * 3 + r][bc * 3 + c]);
          }
        }
        if (box.includes(0) || new Set(box).size !== SIZE) return false;
      }
    }
    return true;
  };

  if (board.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 select-none overflow-y-auto">
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
      </div>
      <div className="mb-2">
        Time: {Math.floor(time / 60)}:{('0' + (time % 60)).slice(-2)}
        {bestTime !== null && (
          <span className="ml-2 text-sm text-gray-300">
            Best: {Math.floor(bestTime / 60)}:{('0' + (bestTime % 60)).slice(-2)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-9" style={{ gap: '2px' }}>
        {board.map((row, r) =>
          row.map((val, c) => {
            const original = puzzle[r][c] !== 0;
            const conflict = hasConflict(board, r, c, val);
            const isHint = hintCell && hintCell.r === r && hintCell.c === c;
            return (
              <div
                key={`${r}-${c}`}
                className={`relative w-8 h-8 sm:w-10 sm:h-10 ${
                  original ? 'bg-gray-300' : 'bg-white'
                } ${conflict ? 'bg-red-300' : ''} ${isHint ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <input
                  className="w-full h-full text-center text-black outline-none"
                  value={val === 0 ? '' : val}
                  onChange={(e) => handleValue(r, c, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key >= '1' && e.key <= '9') {
                      if (noteMode || e.shiftKey) {
                        e.preventDefault();
                        handleValue(r, c, e.key, true);
                      }
                    }
                  }}
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
      {completed && <div className="mt-2">Completed!</div>}
      {hint && <div className="mt-2 text-yellow-300">{hint}</div>}
    </div>
  );
};

export default Sudoku;

