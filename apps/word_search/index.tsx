'use client';
import React, { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/router';
import { generateGrid, createRNG } from './generator';
import type { Position, WordPlacement } from './types';
import wordList from '../../components/apps/wordle_words.json';
import { logGameStart, logGameEnd, logGameError } from '../../utils/analytics';
import GameLayout from '../../components/apps/GameLayout';
import { SettingsProvider, useSettings } from '../../components/apps/GameSettingsContext';
import { PUZZLE_PACKS, PackName } from '../../games/word-search/packs';
import ListImport from '../../games/word-search/components/ListImport';

const WORD_COUNT = 5;
const GRID_SIZE = 12;
const CELL_SIZE = 32; // px size of each grid cell

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

const SAVE_KEY = 'game:word_search:save';
const LB_KEY = 'game:word_search:leaderboard';

interface WordSearchInnerProps {
  getDailySeed?: () => Promise<string>;
}

const WordSearchInner: React.FC<WordSearchInnerProps> = ({ getDailySeed }) => {
  const router = useRouter();
  const { seed: seedQuery, words: wordsQuery } = router.query as { seed?: string; words?: string };
  const [seed, setSeed] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placements, setPlacements] = useState<WordPlacement[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [hintCells, setHintCells] = useState<Set<string>>(new Set());
  const [firstHints, setFirstHints] = useState(3);
  const [lastHints, setLastHints] = useState(3);
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<Position | null>(null);
  const [selection, setSelection] = useState<Position[]>([]);
  const [error, setError] = useState('');
  const startRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const { quality, setQuality, highContrast, setHighContrast } = useSettings();
  const [pack, setPack] = useState<PackName | 'random' | 'custom'>('random');
  const [allowBackwards, setAllowBackwards] = useState(true);
  const [allowDiagonal, setAllowDiagonal] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState('');

  // load saved game on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setSeed(data.seed);
        setWords(data.words);
        setGrid(data.grid);
        setPlacements(data.placements);
        setFound(new Set<string>(data.found));
        setFoundCells(new Set<string>(data.foundCells));
        setHintCells(new Set<string>(data.hintCells || []));
        setFirstHints(data.firstHints ?? 3);
        setLastHints(data.lastHints ?? 3);
      }
    } catch {
      // ignore
    }
  }, []);

  function pickWords(s: string, p: PackName | 'random') {
    if (p !== 'random') {
      return PUZZLE_PACKS[p];
    }
    const rng = createRNG(s);
    const chosen = new Set<string>();
    while (chosen.size < WORD_COUNT) {
      const w = wordList[Math.floor(rng() * wordList.length)];
      chosen.add(w);
    }
    return Array.from(chosen);
  }

  useEffect(() => {
    if (seed && words.length) return; // skip if loaded
    const init = async () => {
      let queryWords: string[] = [];
      if (typeof wordsQuery === 'string') {
        const raw = wordsQuery.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
        if (raw.length) {
          const wordSchema = z.string().regex(/^[A-Za-z]+$/, {
            message: 'Words must contain only letters',
          });
          const listSchema = z.array(wordSchema).min(1, {
            message: 'Please enter at least one word',
          });
          const parsed = listSchema.safeParse(raw);
          if (!parsed.success) {
            const invalid = raw.filter((w) => !/^[A-Za-z]+$/.test(w));
            setError(
              invalid.length
                ? `Invalid words: ${invalid.join(', ')}`
                : parsed.error.issues[0].message,
            );
            return;
          }
          setError('');
          queryWords = parsed.data.map((w) => w.toUpperCase());
        }
      }
      const defaultSeed = (await getDailySeed?.()) ?? new Date().toISOString().split('T')[0];
      const s = typeof seedQuery === 'string' ? seedQuery : defaultSeed;
      setSeed(s);
      setWords(queryWords.length ? queryWords : pickWords(s, pack));
    };
    void init();
  }, [seedQuery, wordsQuery, seed, words.length, getDailySeed, pack]);

  useEffect(() => {
    if (!seed || pack === 'custom') return;
    setWords(pickWords(seed, pack));
  }, [pack, seed]);

  useEffect(() => {
    if (!seed || !words.length) return;
    const { grid: g, placements: p } = generateGrid(words, GRID_SIZE, seed, {
      allowBackwards,
      allowDiagonal,
    });
    setGrid(g);
    setPlacements(p);
    setFound(new Set());
    setFoundCells(new Set());
    setHintCells(new Set());
    setFirstHints(3);
    setLastHints(3);
    startRef.current = Date.now();
    setElapsed(0);
    logGameStart('word_search');
  }, [seed, words, allowBackwards, allowDiagonal]);

  useEffect(() => {
    const id = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // auto-save progress every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const data = {
          seed,
          words,
          grid,
          placements,
          found: Array.from(found),
          foundCells: Array.from(foundCells),
          hintCells: Array.from(hintCells),
          firstHints,
          lastHints,
        };
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(id);
  }, [seed, words, grid, placements, found, foundCells, hintCells, firstHints, lastHints]);

  useEffect(() => {
    if (selection.length) {
      const letters = selection.map((p) => grid[p.row][p.col]).join('');
      setAnnounce(letters);
    }
  }, [selection, grid]);

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

  const finalizeSelection = () => {
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
    setAnnounce(match ? `Found word ${match}` : letters);
    if (match && !found.has(match)) {
      const newFound = new Set(found);
      newFound.add(match);
      setFound(newFound);
      const newCells = new Set(foundCells);
      selection.forEach((p) => newCells.add(key(p)));
      setFoundCells(newCells);
      const newHints = new Set(hintCells);
      selection.forEach((p) => newHints.delete(key(p)));
      setHintCells(newHints);
      if (newFound.size === words.length) {
        const time = Math.floor((Date.now() - startRef.current) / 1000);
        try {
          const lb = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
          lb.push({ seed, time });
          localStorage.setItem(LB_KEY, JSON.stringify(lb));
          const dayKey = `game:word_search:daily:${new Date().toISOString().split('T')[0]}`;
          localStorage.setItem(dayKey, JSON.stringify({ seed, time }));
        } catch {
          // ignore
        }
        logGameEnd('word_search');
      }
    }
    setStart(null);
    setSelection([]);
  };

  const handleMouseUp = () => {
    finalizeSelection();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    r: number,
    c: number,
  ) => {
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return;
      if (e.shiftKey) {
        const s = start ?? { row: r, col: c };
        setStart(s);
        const path = computePath(s, { row: nr, col: nc });
        setSelection(path);
        setSelecting(true);
      } else {
        setStart(null);
        setSelection([]);
        setSelecting(false);
      }
      cellRefs.current[nr]?.[nc]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (selection.length) {
        e.preventDefault();
        finalizeSelection();
      }
    } else if (e.key === 'Escape') {
      setStart(null);
      setSelection([]);
      setSelecting(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Shift' && selecting) {
      finalizeSelection();
    }
  };

  const handleImport = (list: string[]) => {
    if (!list.length) return;
    const newSeed = Math.random().toString(36).slice(2);
    setSeed(newSeed);
    setWords(list);
    setPack('custom');
    router.replace(
      { pathname: router.pathname, query: { seed: newSeed, words: list.join(',') } },
      undefined,
      { shallow: true }
    );
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

  const restart = () => {
    window.localStorage.removeItem(SAVE_KEY);
    setSeed('');
    setWords([]);
    setHintCells(new Set());
    setFirstHints(3);
    setLastHints(3);
  };

  const loadGame = () => {
    try {
      const saved = window.localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setSeed(data.seed);
        setWords(data.words);
        setGrid(data.grid);
        setPlacements(data.placements);
        setFound(new Set<string>(data.found));
        setFoundCells(new Set<string>(data.foundCells));
        setHintCells(new Set<string>(data.hintCells || []));
        setFirstHints(data.firstHints ?? 3);
        setLastHints(data.lastHints ?? 3);
      }
    } catch {
      // ignore
    }
  };

  const exportLeaderboard = () => {
    const data = window.localStorage.getItem(LB_KEY) || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word_search_leaderboard.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importLeaderboard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        JSON.parse(text); // validate
        window.localStorage.setItem(LB_KEY, text);
      } catch {
        // ignore invalid file
      }
    });
  };

  const useFirstHint = () => {
    if (firstHints <= 0) return;
    const remaining = placements.filter(
      (p) => !found.has(p.word) && !hintCells.has(key(p.positions[0]))
    );
    if (!remaining.length) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    const newHints = new Set(hintCells);
    newHints.add(key(target.positions[0]));
    setHintCells(newHints);
    setFirstHints(firstHints - 1);
  };

  const useLastHint = () => {
    if (lastHints <= 0) return;
    const remaining = placements.filter(
      (p) =>
        !found.has(p.word) &&
        !hintCells.has(key(p.positions[p.positions.length - 1]))
    );
    if (!remaining.length) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    const newHints = new Set(hintCells);
    newHints.add(key(target.positions[target.positions.length - 1]));
    setHintCells(newHints);
    setLastHints(lastHints - 1);
  };
  const progress = words.length ? found.size / words.length : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  if (error) {
    return (
      <div className="p-4 text-red-600" role="alert">
        {error}
      </div>
    );
  }

  const baseCellClasses =
    'word-search-cell flex items-center justify-center border font-semibold tracking-wide cursor-pointer select-none transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-selection focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';
  const defaultCellClasses = 'word-search-cell-default';
  const foundCellClasses = 'word-search-cell-found';
  const hintCellClasses = 'word-search-cell-hint';
  const selectionCellClasses = 'word-search-cell-selected';
  const selectionStrokeColor: string = highContrast ? '#facc15' : 'var(--color-selection, #fbbf24)';

  return (
    <div className="p-4 select-none">
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
      <div className="flex flex-wrap gap-2 mb-2 print:hidden items-center">
        <svg viewBox="0 0 36 36" className="w-10 h-10">
          <circle
            className="text-gray-300"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            r={radius}
            cx="18"
            cy="18"
          />
          <circle
            className="text-green-500"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress * circumference}
            strokeLinecap="round"
            r={radius}
            cx="18"
            cy="18"
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
          <text x="18" y="20.5" textAnchor="middle" className="text-xs">{`${found.size}/${words.length}`}</text>
        </svg>
        <span className="text-sm">Time: {elapsed}s</span>
        <select
          value={pack}
          onChange={(e) => setPack(e.target.value as PackName | 'random' | 'custom')}
          className="px-2 py-1 border rounded"
          aria-label="Word list pack"
        >
          <option value="random">Random</option>
          <option value="custom">Custom</option>
          {Object.keys(PUZZLE_PACKS).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label htmlFor="word-search-backwards" className="flex items-center space-x-1">
          <input
            id="word-search-backwards"
            type="checkbox"
            checked={allowBackwards}
            onChange={(e) => setAllowBackwards(e.target.checked)}
            aria-label="Allow backwards words"
          />
          <span className="text-sm">Backwards</span>
        </label>
        <label htmlFor="word-search-diagonal" className="flex items-center space-x-1">
          <input
            id="word-search-diagonal"
            type="checkbox"
            checked={allowDiagonal}
            onChange={(e) => setAllowDiagonal(e.target.checked)}
            aria-label="Allow diagonal words"
          />
          <span className="text-sm">Diagonal</span>
        </label>
        <button type="button" onClick={newPuzzle} className="px-2 py-1 bg-blue-700 text-white rounded">
          New
        </button>
        <button type="button" onClick={copyLink} className="px-2 py-1 bg-green-700 text-white rounded">
          Copy Link
        </button>
        <ListImport onImport={handleImport} />
        <button type="button" onClick={() => window.print()} className="px-2 py-1 bg-gray-700 text-white rounded">
          Print
        </button>
        <button type="button" onClick={loadGame} className="px-2 py-1 bg-indigo-700 text-white rounded">
          Load
        </button>
        <button type="button" onClick={restart} className="px-2 py-1 bg-red-700 text-white rounded">
          Restart
        </button>
        <button type="button" onClick={exportLeaderboard} className="px-2 py-1 bg-yellow-700 text-white rounded">
          Export LB
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-2 py-1 bg-purple-700 text-white rounded"
        >
          Import LB
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={importLeaderboard}
          aria-label="Import leaderboard file"
        />
        <button
          type="button"
          onClick={useFirstHint}
          disabled={firstHints <= 0}
          className="px-2 py-1 bg-teal-700 text-white rounded disabled:opacity-50"
        >
          First Hint ({firstHints})
        </button>
        <button
          type="button"
          onClick={useLastHint}
          disabled={lastHints <= 0}
          className="px-2 py-1 bg-teal-700 text-white rounded disabled:opacity-50"
        >
          Last Hint ({lastHints})
        </button>
        <label htmlFor="word-search-quality" className="flex items-center space-x-1">
          <span className="text-sm">Quality</span>
          <input
            id="word-search-quality"
            type="range"
            min="0.5"
            max="1"
            step="0.1"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            aria-label="Grid scale quality"
          />
        </label>
        <label htmlFor="word-search-high-contrast" className="flex items-center space-x-1">
          <input
            id="word-search-high-contrast"
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            aria-label="Enable high contrast letters"
          />
          <span className="text-sm">High Contrast Letters</span>
        </label>
      </div>
      <div
        className="relative w-max"
        style={{ transform: `scale(${quality})`, transformOrigin: 'top left' }}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
          className={`grid w-max overflow-hidden rounded-lg border border-slate-300 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 ${highContrast ? 'contrast-200' : ''}`}
          role="grid"
          aria-label="Word search grid"
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const posKey = key({ row: r, col: c });
              const isSelected = selection.some((p) => p.row === r && p.col === c);
              const isFound = foundCells.has(posKey);
              const isHint = hintCells.has(posKey);
              const stateClasses = isFound
                ? foundCellClasses
                : isSelected
                ? selectionCellClasses
                : isHint
                ? hintCellClasses
                : defaultCellClasses;
              return (
                <div
                  key={posKey}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  ref={(el) => {
                    if (!cellRefs.current[r]) cellRefs.current[r] = [];
                    cellRefs.current[r][c] = el;
                  }}
                  tabIndex={0}
                  role="gridcell"
                  aria-selected={isSelected}
                  onKeyDown={(e) => handleKeyDown(e, r, c)}
                  onKeyUp={handleKeyUp}
                  className={`${baseCellClasses} ${stateClasses}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE, fontSize: CELL_SIZE * 0.6 }}
                  aria-label={`row ${r + 1} column ${c + 1} letter ${letter}${isFound ? ' found' : ''}`}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
        {selection.length > 1 && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
          >
            <polyline
              className="word-search-selection-line"
              points={selection
                .map((p) => `${p.col * CELL_SIZE + CELL_SIZE / 2},${p.row * CELL_SIZE + CELL_SIZE / 2}`)
                .join(' ')}
              stroke={selectionStrokeColor}
              strokeWidth={CELL_SIZE - 4}
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <ul className="mt-6 grid gap-3 list-none p-0 sm:grid-cols-2 lg:grid-cols-3">
        {words.map((w) => (
          <li
            key={w}
            className={`word-search-clue${found.has(w) ? ' word-search-clue-found word-found' : ''}`}
          >
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
};

interface WordSearchProps {
  getDailySeed?: () => Promise<string>;
}

const WordSearch: React.FC<WordSearchProps> = ({ getDailySeed }) => (
  <SettingsProvider>
    <GameLayout gameId="word_search">
      <WordSearchInner getDailySeed={getDailySeed} />
    </GameLayout>
  </SettingsProvider>
);

export default WordSearch;
