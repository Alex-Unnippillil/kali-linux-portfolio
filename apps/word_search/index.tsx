import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { generateGrid, createRNG } from './generator';
import type { Position, WordPlacement } from './types';
import wordList from '../../components/apps/wordle_words.json';
import { logGameStart, logGameEnd, logGameError } from '../../utils/analytics';

const WORD_COUNT = 5;
const GRID_SIZE = 12;

function key(p: Position) {
  return `${p.row}-${p.col}`;
}

function computePath(start: Position, end: Position): Position[] {
  const dx = Math.sign(end.col - start.col);
  const dy = Math.sign(end.row - start.row);
  const len = Math.max(Math.abs(end.col - start.col), Math.abs(end.row - start.row));
  if (dx !== 0 && dy !== 0 && Math.abs(end.col - start.col) !== Math.abs(end.row - start.row)) {
    return [start];
  }
  const path: Position[] = [];
  for (let i = 0; i <= len; i += 1) {
    path.push({ row: start.row + dy * i, col: start.col + dx * i });
  }
  return path;
}

const WordSearch: React.FC = () => {
  const router = useRouter();
  const { seed: seedQuery, words: wordsQuery } = router.query as { seed?: string; words?: string };
  const [seed, setSeed] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placements, setPlacements] = useState<WordPlacement[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<Position | null>(null);
  const [selection, setSelection] = useState<Position[]>([]);

  function pickWords(s: string) {
    const rng = createRNG(s);
    const chosen = new Set<string>();
    while (chosen.size < WORD_COUNT) {
      const w = wordList[Math.floor(rng() * wordList.length)];
      chosen.add(w);
    }
    return Array.from(chosen);
  }

  useEffect(() => {
    const queryWords =
      typeof wordsQuery === 'string'
        ? wordsQuery.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean)
        : [];
    const defaultSeed = new Date().toISOString().split('T')[0];
    const s = typeof seedQuery === 'string' ? seedQuery : defaultSeed;
    setSeed(s);
    setWords(queryWords.length ? queryWords : pickWords(s));
  }, [seedQuery, wordsQuery]);

  useEffect(() => {
    if (!seed || !words.length) return;
    const { grid: g, placements: p } = generateGrid(words, GRID_SIZE, seed);
    setGrid(g);
    setPlacements(p);
    setFound(new Set());
    setFoundCells(new Set());
    logGameStart('word_search');
  }, [seed, words]);

  const handleMouseDown = (r: number, c: number) => {
    setSelecting(true);
    const s = { row: r, col: c };
    setStart(s);
    setSelection([s]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!selecting || !start) return;
    const path = computePath(start, { row: r, col: c });
    setSelection(path);
  };

  const handleMouseUp = () => {
    if (!selecting) return;
    setSelecting(false);
    if (!selection.length) {
      setStart(null);
      setSelection([]);
      return;
    }
    const letters = selection.map((p) => grid[p.row][p.col]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = words.find((w) => w === letters || w === reversed);
    if (match && !found.has(match)) {
      const newFound = new Set(found);
      newFound.add(match);
      setFound(newFound);
      const newCells = new Set(foundCells);
      selection.forEach((p) => newCells.add(key(p)));
      setFoundCells(newCells);
      if (newFound.size === words.length) {
        logGameEnd('word_search');
      }
    }
    setStart(null);
    setSelection([]);
  };

  const copyLink = async () => {
    const params = new URLSearchParams({ seed, words: words.join(',') });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard?.writeText(url);
    } catch (e: any) {
      logGameError('word_search', e?.message || String(e));
    }
  };

  const newPuzzle = () => {
    const newSeed = Math.random().toString(36).slice(2);
    router.replace(
      { pathname: router.pathname, query: { seed: newSeed, words: words.join(',') } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <div className="p-4 select-none">
      <div className="flex space-x-2 mb-2 print:hidden">
        <button
          type="button"
          onClick={newPuzzle}
          className="px-2 py-1 bg-blue-700 text-white rounded"
        >
          New
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="px-2 py-1 bg-green-700 text-white rounded"
        >
          Copy Link
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-2 py-1 bg-gray-700 text-white rounded"
        >
          Print
        </button>
      </div>
      <div
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 2rem)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 2rem)`,
        }}
        className="grid border w-max"
        onMouseLeave={handleMouseUp}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const posKey = key({ row: r, col: c });
            const isSelected = selection.some((p) => p.row === r && p.col === c);
            const isFound = foundCells.has(posKey);
            return (
              <div
                key={posKey}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseUp={handleMouseUp}
                className={`w-8 h-8 flex items-center justify-center border text-sm font-bold cursor-pointer select-none ${isFound ? 'bg-green-300' : isSelected ? 'bg-yellow-300' : 'bg-white'}`}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
      <ul className="mt-4 columns-2 md:columns-3">
        {words.map((w) => (
          <li key={w} className={found.has(w) ? 'line-through text-gray-500' : ''}>
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WordSearch;
