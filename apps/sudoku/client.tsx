import React, { useEffect, useState } from 'react';
import Board from './board';
import type { Board as BoardType, UserStats } from './types';
import { generatePuzzle } from './generator';
import { solveAsync, getHintAsync } from './solver';

const SudokuClient: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [puzzle, setPuzzle] = useState<BoardType | null>(null);
  const [solution, setSolution] = useState<BoardType | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [pencil, setPencil] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [errorFree, setErrorFree] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('sudoku_user');
    if (u) {
      setUser(u);
      const s = localStorage.getItem(`sudoku_stats_${u}`);
      if (s) setStats(JSON.parse(s));
    } else {
      const name = prompt('Enter username');
      if (name) {
        setUser(name);
        localStorage.setItem('sudoku_user', name);
      }
    }
  }, []);

  const newPuzzle = async () => {
    const p = generatePuzzle(difficulty);
    setPuzzle(p);
    const sol = await solveAsync(p);
    setSolution(sol);
  };

  useEffect(() => {
    if (user && !puzzle) {
      newPuzzle();
    }
  }, [user]);

  const complete = () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    let newStats: UserStats;
    if (stats) {
      const last = stats.lastSolved;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const streak = last === yStr ? stats.streak + 1 : 1;
      newStats = {
        puzzlesSolved: stats.puzzlesSolved + 1,
        streak,
        lastSolved: today,
        achievements: [...stats.achievements],
      };
      if (newStats.puzzlesSolved === 1) newStats.achievements.push('First Solve');
      if (newStats.puzzlesSolved === 10 && !newStats.achievements.includes('Tenacious'))
        newStats.achievements.push('Tenacious');
    } else {
      newStats = { puzzlesSolved: 1, streak: 1, lastSolved: today, achievements: ['First Solve'] };
    }
    setStats(newStats);
    localStorage.setItem(`sudoku_stats_${user}`, JSON.stringify(newStats));
    alert('Solved!');
    newPuzzle();
  };

  const hint = async () => {
    if (!puzzle) return;
    const h = await getHintAsync(puzzle);
    if (h) {
      const newPuzzle = puzzle.map((row) => [...row]);
      newPuzzle[h.row][h.col] = h.value;
      setPuzzle(newPuzzle);
      alert(h.message);
    } else {
      alert('No hints available');
    }
  };

  if (!puzzle || !solution) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="mb-2 space-x-2">
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button
          type="button"
          className="px-2 py-1 bg-blue-600 text-white rounded"
          onClick={newPuzzle}
        >
          New Puzzle
        </button>
        <button
          type="button"
          className="px-2 py-1 bg-green-600 text-white rounded"
          onClick={hint}
        >
          Hint
        </button>
      </div>
      <div className="mb-2 space-x-4">
        <label>
          <input type="checkbox" checked={pencil} onChange={(e) => setPencil(e.target.checked)} />
          {' '}Pencil Marks
        </label>
        <label>
          <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
          {' '}Highlight
        </label>
        <label>
          <input type="checkbox" checked={errorFree} onChange={(e) => setErrorFree(e.target.checked)} />
          {' '}Error Check
        </label>
      </div>
      <Board
        puzzle={puzzle}
        solution={solution}
        storageKey={`sudoku_${user}`}
        onComplete={complete}
        pencil={pencil}
        errorFree={errorFree}
        highlight={highlight}
      />
      {stats && (
        <div className="mt-4">
          <p>Puzzles solved: {stats.puzzlesSolved}</p>
          <p>Streak: {stats.streak}</p>
          <p>Achievements: {stats.achievements.join(', ')}</p>
        </div>
      )}
    </div>
  );
};

export default SudokuClient;

