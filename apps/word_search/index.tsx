import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

const CELL_SIZE = 32; // px size of each grid cell

const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    gridSize: 10,
    wordCount: 6,
    allowBackwards: false,
    allowDiagonal: false,
  },
  medium: {
    label: 'Medium',
    gridSize: 12,
    wordCount: 8,
    allowBackwards: true,
    allowDiagonal: false,
  },
  hard: {
    label: 'Hard',
    gridSize: 14,
    wordCount: 10,
    allowBackwards: true,
    allowDiagonal: true,
  },
} as const;

type DifficultyKey = keyof typeof DIFFICULTIES;

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

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const SAVE_KEY = 'game:word_search:save';
const LB_KEY = 'game:word_search:leaderboard';

interface WordSearchInnerProps {
  getDailySeed?: () => Promise<string>;
}

const WordSearchInner: React.FC<WordSearchInnerProps> = ({ getDailySeed }) => {
  const router = useRouter();
  const {
    seed: seedQuery,
    words: wordsQuery,
    difficulty: difficultyQuery,
    pack: packQuery,
    backwards: backwardsQuery,
    diagonal: diagonalQuery,
  } = router.query as {
    seed?: string;
    words?: string;
    difficulty?: string;
    pack?: string;
    backwards?: string;
    diagonal?: string;
  };
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
  const [difficulty, setDifficulty] = useState<DifficultyKey>('medium');
  const [allowBackwards, setAllowBackwards] = useState<boolean>(
    DIFFICULTIES.medium.allowBackwards,
  );
  const [allowDiagonal, setAllowDiagonal] = useState<boolean>(DIFFICULTIES.medium.allowDiagonal);
  const [elapsed, setElapsed] = useState(0);
  const [announce, setAnnounce] = useState('');
  const [gridSize, setGridSize] = useState(DIFFICULTIES.medium.gridSize);
  const [seedInput, setSeedInput] = useState('');

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
        if (data.pack) {
          setPack(data.pack);
        }
        if (data.difficulty && data.difficulty in DIFFICULTIES) {
          setDifficulty(data.difficulty as DifficultyKey);
        }
        if (typeof data.allowBackwards === 'boolean') {
          setAllowBackwards(data.allowBackwards);
        }
        if (typeof data.allowDiagonal === 'boolean') {
          setAllowDiagonal(data.allowDiagonal);
        }
        if (typeof data.gridSize === 'number') {
          setGridSize(data.gridSize);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setSeedInput(seed);
  }, [seed]);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof packQuery === 'string') {
      if (packQuery === 'random' || packQuery === 'custom' || packQuery in PUZZLE_PACKS) {
        setPack(packQuery as PackName | 'random' | 'custom');
      }
    }
    if (typeof difficultyQuery === 'string' && difficultyQuery in DIFFICULTIES) {
      const key = difficultyQuery as DifficultyKey;
      setDifficulty(key);
      setAllowBackwards(DIFFICULTIES[key].allowBackwards);
      setAllowDiagonal(DIFFICULTIES[key].allowDiagonal);
      setGridSize(DIFFICULTIES[key].gridSize);
    }
    if (typeof backwardsQuery === 'string') {
      setAllowBackwards(backwardsQuery === '1' || backwardsQuery.toLowerCase() === 'true');
    }
    if (typeof diagonalQuery === 'string') {
      setAllowDiagonal(diagonalQuery === '1' || diagonalQuery.toLowerCase() === 'true');
    }
  }, [router.isReady, packQuery, difficultyQuery, backwardsQuery, diagonalQuery]);

  const difficultySettings = DIFFICULTIES[difficulty];

  const pickWords = useCallback(
    (s: string, p: PackName | 'random', wordCount: number) => {
      if (p !== 'random') {
        const list = PUZZLE_PACKS[p];
        if (list.length <= wordCount) {
          return list;
        }
        const rng = createRNG(`${s}:${p}`);
        const chosen = new Set<string>();
        while (chosen.size < wordCount) {
          const w = list[Math.floor(rng() * list.length)];
          chosen.add(w);
        }
        return Array.from(chosen);
      }
      const rng = createRNG(`${s}:${difficulty}`);
      const chosen = new Set<string>();
      while (chosen.size < wordCount) {
        const w = wordList[Math.floor(rng() * wordList.length)];
        chosen.add(w);
      }
      return Array.from(chosen);
    },
    [difficulty],
  );

  useEffect(() => {
    if (!router.isReady) return;
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
      if (queryWords.length) {
        setPack('custom');
        setWords(queryWords);
      } else {
        setWords(pickWords(s, pack, difficultySettings.wordCount));
      }
    };
    void init();
  }, [
    router.isReady,
    seedQuery,
    wordsQuery,
    seed,
    words.length,
    getDailySeed,
    pack,
    pickWords,
    difficultySettings.wordCount,
  ]);

  useEffect(() => {
    if (!seed || pack === 'custom') return;
    setWords(pickWords(seed, pack, difficultySettings.wordCount));
  }, [pack, seed, pickWords, difficultySettings.wordCount]);

  useEffect(() => {
    if (!seed || !words.length) return;
    const longestWord = words.reduce((max, word) => Math.max(max, word.length), 0);
    const boardSize = Math.max(difficultySettings.gridSize, longestWord + 2);
    const generatorSeed = `${seed}:${difficulty}:${allowBackwards ? 'B1' : 'B0'}:${allowDiagonal ? 'D1' : 'D0'}`;
    const { grid: g, placements: p } = generateGrid(words, boardSize, generatorSeed, {
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
    setGridSize(boardSize);
    cellRefs.current = [];
  }, [
    seed,
    words,
    allowBackwards,
    allowDiagonal,
    difficulty,
    difficultySettings.gridSize,
  ]);

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
          difficulty,
          pack,
          allowBackwards,
          allowDiagonal,
          gridSize,
        };
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(id);
  }, [
    seed,
    words,
    grid,
    placements,
    found,
    foundCells,
    hintCells,
    firstHints,
    lastHints,
    difficulty,
    pack,
    allowBackwards,
    allowDiagonal,
    gridSize,
  ]);

  useEffect(() => {
    if (selection.length) {
      const letters = selection.map((p) => grid[p.row][p.col]).join('');
      setAnnounce(letters);
    }
  }, [selection, grid]);

  const getQueryObject = useCallback(
    (override?: {
      seed?: string;
      words?: string[];
      pack?: PackName | 'random' | 'custom';
      difficulty?: DifficultyKey;
      allowBackwards?: boolean;
      allowDiagonal?: boolean;
    }) => {
      const nextSeed = override?.seed ?? seed;
      const nextPack = override?.pack ?? pack;
      const nextDifficulty = override?.difficulty ?? difficulty;
      const nextAllowBackwards = override?.allowBackwards ?? allowBackwards;
      const nextAllowDiagonal = override?.allowDiagonal ?? allowDiagonal;
      const nextWords = override?.words ?? (nextPack === 'custom' ? words : []);
      const params: Record<string, string> = {
        seed: nextSeed,
        difficulty: nextDifficulty,
        pack: nextPack,
        backwards: nextAllowBackwards ? '1' : '0',
        diagonal: nextAllowDiagonal ? '1' : '0',
      };
      if (nextWords.length) {
        params.words = nextWords.join(',');
      }
      return params;
    },
    [seed, pack, difficulty, allowBackwards, allowDiagonal, words],
  );

  const updateQuery = useCallback(
    (override?: {
      seed?: string;
      words?: string[];
      pack?: PackName | 'random' | 'custom';
      difficulty?: DifficultyKey;
      allowBackwards?: boolean;
      allowDiagonal?: boolean;
    }) => {
      router.replace(
        { pathname: router.pathname, query: getQueryObject(override) },
        undefined,
        { shallow: true },
      );
    },
    [router, getQueryObject],
  );

  const commitWord = useCallback(
    (word: string, path: Position[]) => {
      let added = false;
      let newCount = 0;
      setFound((prev) => {
        if (prev.has(word)) {
          return prev;
        }
        const updated = new Set(prev);
        updated.add(word);
        newCount = updated.size;
        added = true;
        return updated;
      });
      if (!added) {
        return;
      }
      setFoundCells((prev) => {
        const updated = new Set(prev);
        path.forEach((p) => updated.add(key(p)));
        return updated;
      });
      setHintCells((prev) => {
        const updated = new Set(prev);
        path.forEach((p) => updated.delete(key(p)));
        return updated;
      });
      setAnnounce(`Found word ${word}`);
      if (newCount === words.length) {
        const time = Math.floor((Date.now() - startRef.current) / 1000);
        startRef.current = 0;
        try {
          const lb = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
          lb.push({ seed, time, difficulty });
          localStorage.setItem(LB_KEY, JSON.stringify(lb));
          const dayKey = `game:word_search:daily:${new Date().toISOString().split('T')[0]}`;
          localStorage.setItem(dayKey, JSON.stringify({ seed, time, difficulty }));
        } catch {
          // ignore
        }
        logGameEnd('word_search');
      }
    },
    [difficulty, seed, words.length],
  );

  const handleDifficultyChange = (value: DifficultyKey) => {
    const settings = DIFFICULTIES[value];
    setDifficulty(value);
    setAllowBackwards(settings.allowBackwards);
    setAllowDiagonal(settings.allowDiagonal);
    setGridSize(settings.gridSize);
    updateQuery({
      difficulty: value,
      allowBackwards: settings.allowBackwards,
      allowDiagonal: settings.allowDiagonal,
    });
  };

  const handleSeedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = seedInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.toUpperCase();
    setSeed(normalized);
    updateQuery({ seed: normalized });
  };

  const handlePackChange = (value: PackName | 'random' | 'custom') => {
    setPack(value);
    updateQuery({ pack: value });
  };

  const handleBackwardsToggle = (checked: boolean) => {
    setAllowBackwards(checked);
    updateQuery({ allowBackwards: checked });
  };

  const handleDiagonalToggle = (checked: boolean) => {
    setAllowDiagonal(checked);
    updateQuery({ allowDiagonal: checked });
  };

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
    const letters = path.map((p) => grid[p.row][p.col]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = words.find((w) => w === letters || w === reversed);
    if (match) {
      commitWord(match, path);
      setSelecting(false);
      setStart(null);
      setSelection([]);
    }
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
    if (match) {
      commitWord(match, selection);
    } else {
      setAnnounce(letters);
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
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return;
      if (e.shiftKey) {
        const s = start ?? { row: r, col: c };
        setStart(s);
        const path = computePath(s, { row: nr, col: nc });
        setSelection(path);
        const letters = path.map((p) => grid[p.row][p.col]).join('');
        const reversed = letters.split('').reverse().join('');
        const match = words.find((w) => w === letters || w === reversed);
        if (match) {
          commitWord(match, path);
          setSelecting(false);
          setStart(null);
          setSelection([]);
        } else {
          setSelecting(true);
        }
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
    const upper = list.map((item) => item.toUpperCase());
    setWords(upper);
    setPack('custom');
    updateQuery({ seed: newSeed, words: upper, pack: 'custom' });
  };

  const copyLink = async () => {
    const params = new URLSearchParams(getQueryObject());
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard?.writeText(url);
    } catch (e: any) {
      logGameError('word_search', e?.message || String(e));
    }
  };

  const newPuzzle = () => {
    const newSeed = Math.random().toString(36).slice(2);
    setSeed(newSeed);
    updateQuery({ seed: newSeed });
  };

  const restart = () => {
    window.localStorage.removeItem(SAVE_KEY);
    setSeed('');
    setSeedInput('');
    setWords([]);
    setHintCells(new Set());
    setFirstHints(3);
    setLastHints(3);
    setPack('random');
    setDifficulty('medium');
    setAllowBackwards(DIFFICULTIES.medium.allowBackwards);
    setAllowDiagonal(DIFFICULTIES.medium.allowDiagonal);
    setGridSize(DIFFICULTIES.medium.gridSize);
    router.replace(
      { pathname: router.pathname },
      undefined,
      { shallow: true }
    );
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
        if (data.pack) {
          setPack(data.pack);
        }
        if (data.difficulty && data.difficulty in DIFFICULTIES) {
          setDifficulty(data.difficulty as DifficultyKey);
        }
        if (typeof data.allowBackwards === 'boolean') {
          setAllowBackwards(data.allowBackwards);
        }
        if (typeof data.allowDiagonal === 'boolean') {
          setAllowDiagonal(data.allowDiagonal);
        }
        if (typeof data.gridSize === 'number') {
          setGridSize(data.gridSize);
        }
        const overrides: {
          seed?: string;
          words?: string[];
          pack?: PackName | 'random' | 'custom';
        } = { seed: data.seed };
        if (Array.isArray(data.words)) {
          overrides.words = data.words;
        }
        if (data.pack) {
          overrides.pack = data.pack;
        }
        updateQuery(overrides);
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
  const remainingWords = useMemo(
    () => words.filter((w) => !found.has(w)),
    [words, found],
  );
  const foundWordsList = useMemo(
    () => words.filter((w) => found.has(w)),
    [words, found],
  );
  const formattedElapsed = useMemo(() => formatTime(elapsed), [elapsed]);
  const allFound = words.length > 0 && foundWordsList.length === words.length;

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
      <div className="flex flex-wrap gap-2 mb-3 print:hidden items-center">
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
        <span className="text-sm font-semibold">Time: {formattedElapsed}</span>
        <div className="flex items-center gap-1">
          <label htmlFor="word-search-difficulty" className="text-sm font-medium">
            Difficulty
          </label>
          <select
            id="word-search-difficulty"
            value={difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value as DifficultyKey)}
            className="px-2 py-1 border rounded"
          >
            {Object.entries(DIFFICULTIES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
        <form
          onSubmit={handleSeedSubmit}
          className="flex items-center gap-1"
          aria-label="Set puzzle seed"
        >
          <label htmlFor="word-search-seed" className="text-sm font-medium">
            Seed
          </label>
          <input
            id="word-search-seed"
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value.toUpperCase())}
            className="px-2 py-1 border rounded uppercase"
            placeholder="Enter seed"
            aria-describedby="word-search-seed-help"
            aria-label="Puzzle seed"
          />
          <button type="submit" className="px-2 py-1 bg-slate-700 text-white rounded">
            Apply
          </button>
        </form>
        <span id="word-search-seed-help" className="sr-only">
          Set the current puzzle seed to reproduce a board
        </span>
        <select
          value={pack}
          onChange={(e) => handlePackChange(e.target.value as PackName | 'random' | 'custom')}
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
            onChange={(e) => handleBackwardsToggle(e.target.checked)}
            aria-label="Allow backwards words"
          />
          <span className="text-sm">Backwards</span>
        </label>
        <label htmlFor="word-search-diagonal" className="flex items-center space-x-1">
          <input
            id="word-search-diagonal"
            type="checkbox"
            checked={allowDiagonal}
            onChange={(e) => handleDiagonalToggle(e.target.checked)}
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
            gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${CELL_SIZE}px)`,
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
            width={gridSize * CELL_SIZE}
            height={gridSize * CELL_SIZE}
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
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="word-search-remaining" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 id="word-search-remaining" className="text-sm font-semibold uppercase tracking-wide">
                Words to Find
              </h2>
              <span className="text-xs text-slate-500">{remainingWords.length}</span>
            </div>
            {remainingWords.length ? (
              <ul className="grid gap-2 list-none p-0" aria-live="polite">
                {remainingWords.map((w) => (
                  <li key={w} className="word-search-clue">
                    {w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">All words found!</p>
            )}
          </section>
          <section aria-labelledby="word-search-found" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 id="word-search-found" className="text-sm font-semibold uppercase tracking-wide">
                Found Words
              </h2>
              <span className="text-xs text-slate-500">{foundWordsList.length}</span>
            </div>
            <ul className="grid gap-2 list-none p-0" aria-live="polite">
              {foundWordsList.length ? (
                foundWordsList.map((w) => (
                  <li key={w} className="word-search-clue word-search-clue-found word-found">
                    {w}
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">Start searching to see words here.</li>
              )}
            </ul>
            {allFound && (
              <p className="text-xs text-emerald-600">Puzzle complete! Share the seed to challenge friends.</p>
            )}
          </section>
        </div>
      </div>
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
