import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import seedrandom from "seedrandom";
import GameLayout from "./GameLayout";
import useOPFS from "../../hooks/useOPFS.js";
import usePersistentState from "../../hooks/usePersistentState.js";
import {
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  DEFAULT_DIFFICULTY,
  getDifficultyConfig,
} from "../../games/word-search/config";
import { PUZZLE_PACKS } from "../../games/word-search/packs";
import {
  loadTimerState,
  persistTimerState,
  clearTimerState,
  formatTime,
  computeElapsed,
} from "../../games/word-search/timer";

const CELL_SIZE = 32;
const GAP_SIZE = 4;

const ALPHABETS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
  fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  de: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

const BUILT_IN_LISTS = Object.fromEntries(
  Object.entries(PUZZLE_PACKS).map(([key, pack]) => [
    key,
    {
      language: pack.language,
      words: pack.words,
      label: pack.label,
      source: pack.source,
    },
  ]),
);

const ORTHO_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

const DIAG_DIRECTIONS = [
  { dx: 1, dy: 1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
];

const ALL_DIRECTIONS = [...ORTHO_DIRECTIONS, ...DIAG_DIRECTIONS];

const filterDirections = (directions, allowBackwards) =>
  allowBackwards ? directions : directions.filter((dir) => dir.dx >= 0 && dir.dy >= 0);

const randomLetter = (rng, alphabet) =>
  alphabet[Math.floor(rng() * alphabet.length)];

export const generatePuzzle = (
  size,
  words,
  rng,
  alphabet,
  diagonals = true,
  allowBackwards = true,
) => {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = {};
  const candidateDirections = diagonals ? ALL_DIRECTIONS : ORTHO_DIRECTIONS;
  const directions = filterDirections(candidateDirections, allowBackwards);

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt += 1) {
      const dir = directions[Math.floor(rng() * directions.length)];
      const maxRow =
        dir.dy > 0
          ? size - word.length
          : dir.dy < 0
            ? word.length - 1
            : size - 1;
      const maxCol =
        dir.dx > 0
          ? size - word.length
          : dir.dx < 0
            ? word.length - 1
            : size - 1;
      const row = Math.floor(rng() * (maxRow + 1));
      const col = Math.floor(rng() * (maxCol + 1));

      let fits = true;
      for (let i = 0; i < word.length; i += 1) {
        const r = row + dir.dy * i;
        const c = col + dir.dx * i;
        if (grid[r][c] && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < word.length; i += 1) {
          const r = row + dir.dy * i;
          const c = col + dir.dx * i;
          grid[r][c] = word[i];
        }
        placements[word] = { row, col, dx: dir.dx, dy: dir.dy };
        placed = true;
      }
    }
  });

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) grid[r][c] = randomLetter(rng, alphabet);
    }
  }

  return { grid, placements, words };
};

const getPath = (start, end) => {
  if (!start || !end) return [];
  const [sr, sc] = start;
  const [er, ec] = end;
  const dx = Math.sign(ec - sc);
  const dy = Math.sign(er - sr);
  const len = Math.max(Math.abs(ec - sc), Math.abs(er - sr));
  if (dx !== 0 && dy !== 0 && Math.abs(ec - sc) !== Math.abs(er - sr)) return [];
  const path = [];
  for (let i = 0; i <= len; i += 1) {
    path.push([sr + dy * i, sc + dx * i]);
  }
  return path;
};

const pickWords = (count, listKey, rng, lists, language) => {
  let pool;
  if (listKey && lists[listKey]) {
    pool = lists[listKey].words;
  } else {
    const available = Object.values(lists).filter(
      (list) => !language || list.language === language,
    );
    pool =
      available[Math.floor(rng() * available.length)]?.words ||
      Object.values(lists)[0]?.words ||
      [];
  }
  return [...pool].sort(() => rng() - 0.5).slice(0, count);
};

const WordSearch = () => {
  const [difficulty, setDifficulty] = usePersistentState(
    "wordsearch-difficulty",
    DEFAULT_DIFFICULTY,
    (value) => typeof value === "string" && value in DIFFICULTIES,
  );
  const [listName, setListName] = usePersistentState("wordsearch-list", "random");
  const [language, setLanguage] = usePersistentState("wordsearch-language", "en");
  const [seed, setSeed] = usePersistentState("wordsearch-seed", () =>
    Math.random().toString(36).slice(2, 10),
  );
  const [customLists, setCustomLists, listsReady] = useOPFS(
    "wordsearch-lists.json",
    {},
  );
  const allLists = useMemo(
    () => ({ ...BUILT_IN_LISTS, ...customLists }),
    [customLists],
  );
  const alphabet = ALPHABETS[language] || ALPHABETS.en;
  const config = getDifficultyConfig(difficulty);
  const SIZE = config.size;
  const WORD_COUNT = config.wordCount;
  const timerMode = config.timer.mode;
  const timerLimit = config.timer.limit ?? 0;
  const allowDiagonal = config.allowDiagonal;
  const allowBackwards = config.allowBackwards;

  const [bestTimes, setBestTimes] = usePersistentState(
    "wordsearch-best-times",
    {},
  );
  const [sound, setSound] = usePersistentState("wordsearch-sound", true);
  const [streak, setStreak] = usePersistentState("wordsearch-streak", 0);
  const [newListName, setNewListName] = useState("");
  const [newListWords, setNewListWords] = useState("");
  const [newListLang, setNewListLang] = useState("en");
  const [puzzle, setPuzzle] = useState({ grid: [], placements: {}, words: [] });
  const { grid, placements, words } = puzzle;
  const GRID_PIXELS = SIZE * (CELL_SIZE + GAP_SIZE) - GAP_SIZE;
  const [foundWords, setFoundWords] = useState([]);
  const [foundCells, setFoundCells] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const [time, setTime] = useState(timerMode === "countdown" ? timerLimit : 0);
  const [paused, setPaused] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);
  const [lassos, setLassos] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef(null);
  const gridRef = useRef(null);
  const polyRefs = useRef([]);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
  }, []);

  const reset = useCallback(
    ({ failed = true, nextSeed, preserveTimer = false } = {}) => {
      const s = nextSeed || Math.random().toString(36).slice(2, 10);
      setSeed((current) => (current === s ? current : s));
      const rng = seedrandom(s);
      const wordsForPuzzle = pickWords(
        WORD_COUNT,
        listName === "random" ? undefined : listName,
        rng,
        allLists,
        language,
      ).map((word) => word.toUpperCase());
      setPuzzle(
        generatePuzzle(
          SIZE,
          wordsForPuzzle,
          rng,
          alphabet,
          allowDiagonal,
          allowBackwards,
        ),
      );
      setFoundWords([]);
      setFoundCells([]);
      setHintCells([]);
      setStart(null);
      setEnd(null);
      setSelection([]);
      setLassos([]);
      polyRefs.current = [];
      setAnnouncement("");
      setPaused(false);
      setTime(timerMode === "countdown" ? timerLimit : 0);
      if (!preserveTimer && typeof window !== "undefined") {
        clearTimerState(window.localStorage);
      }
      if (failed) setStreak(0);
    },
    [
      WORD_COUNT,
      listName,
      allLists,
      language,
      SIZE,
      alphabet,
      allowDiagonal,
      allowBackwards,
      timerMode,
      timerLimit,
      setSeed,
      setStreak,
    ],
  );

  useEffect(() => {
    if (!listsReady) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlDifficulty = params.get("difficulty");
      if (urlDifficulty && urlDifficulty in DIFFICULTIES) {
        setDifficulty(urlDifficulty);
      }
      const urlLang = params.get("lang");
      if (urlLang && ALPHABETS[urlLang]) {
        setLanguage(urlLang);
      }
      const urlList = params.get("list");
      if (urlList && allLists[urlList]) {
        setListName(urlList);
      }
      const urlSeed = params.get("seed");
      if (urlSeed) {
        reset({ failed: true, nextSeed: urlSeed, preserveTimer: true });
        return;
      }
    }
    reset({ failed: true, nextSeed: seed, preserveTimer: true });
  }, [listsReady, reset, seed, allLists, setDifficulty, setLanguage, setListName]);

  const playBeep = useCallback(() => {
    if (!sound || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 620;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 150);
    } catch {
      // ignore audio errors
    }
  }, [sound]);

  useEffect(() => {
    if (paused || !words.length) return undefined;
    timerRef.current = setInterval(() => {
      setTime((current) =>
        timerMode === "countdown" ? Math.max(0, current - 1) : current + 1,
      );
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, timerMode, words.length]);

  useEffect(() => {
    if (timerMode === "countdown" && time <= 0 && words.length) {
      setPaused(true);
      setAnnouncement("Time is up");
      setStreak(0);
    }
  }, [timerMode, time, words.length, setStreak]);

  useEffect(() => {
    if (!words.length || foundWords.length !== words.length) return undefined;
    setPaused(true);
    const elapsed = computeElapsed(timerMode, time, timerLimit);
    setAnnouncement(`Solved in ${formatTime(elapsed)}`);
    setBestTimes((prev) => {
      const best = prev[difficulty];
      if (best == null || elapsed < best) {
        return { ...prev, [difficulty]: elapsed };
      }
      return prev;
    });
    setStreak((value) => value + 1);
    if (typeof window !== "undefined") {
      clearTimerState(window.localStorage);
    }
    const timeout = setTimeout(() => reset({ failed: false }), 800);
    return () => clearTimeout(timeout);
  }, [foundWords.length, words.length, timerMode, time, timerLimit, difficulty, reset, setBestTimes, setStreak]);

  useEffect(() => {
    if (start && end) {
      setSelection(getPath(start, end));
    }
  }, [start, end]);

  useEffect(() => {
    if (!lassos.length || prefersReducedMotion.current) return;
    const poly = polyRefs.current[lassos.length - 1];
    if (!poly) return;
    const length = poly.getTotalLength();
    poly.style.strokeDasharray = length;
    poly.style.strokeDashoffset = length;
    let begin;
    const animate = (ts) => {
      if (begin === undefined) begin = ts;
      const progress = Math.min((ts - begin) / 600, 1);
      poly.style.strokeDashoffset = length * (1 - progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [lassos]);

  useEffect(() => {
    if (!listsReady || typeof window === "undefined") return;
    const snapshot = loadTimerState(
      window.localStorage,
      seed,
      difficulty,
      {
        initialValue: timerMode === "countdown" ? timerLimit : 0,
        mode: timerMode,
        limit: timerMode === "countdown" ? timerLimit : null,
      },
    );
    setTime(snapshot.value);
    setPaused(snapshot.paused);
  }, [listsReady, seed, difficulty, timerMode, timerLimit]);

  useEffect(() => {
    if (!listsReady || !words.length || typeof window === "undefined") return;
    persistTimerState(window.localStorage, {
      seed,
      difficulty,
      mode: timerMode,
      value: time,
      paused,
      limit: timerMode === "countdown" ? timerLimit : null,
    });
  }, [listsReady, words.length, seed, difficulty, timerMode, time, paused, timerLimit]);

  const handleMouseDown = (r, c) => {
    if (paused) return;
    setStart([r, c]);
    setEnd([r, c]);
    setSelecting(true);
  };

  const handleMouseEnter = (r, c) => {
    if (paused || !selecting) return;
    setEnd([r, c]);
  };

  const finalizeSelection = useCallback(() => {
    if (!selecting || !selection.length || paused) return;
    const letters = selection.map(([r, c]) => grid[r][c]).join("");
    const reverse = letters.split("").reverse().join("");
    const match = words.find((w) => w === letters || w === reverse);
    if (match && !foundWords.includes(match)) {
      setFoundWords((prev) => [...prev, match]);
      setFoundCells((prev) => {
        const next = new Set(prev.map(([r, c]) => `${r}-${c}`));
        selection.forEach(([r, c]) => next.add(`${r}-${c}`));
        return Array.from(next).map((cell) => cell.split("-").map(Number));
      });
      setLassos((prev) => [...prev, { word: match, path: selection }]);
      setAnnouncement(`${match} found`);
      playBeep();
    }
    setSelecting(false);
    setStart(null);
    setEnd(null);
    setSelection([]);
  }, [selecting, selection, paused, grid, words, foundWords, playBeep]);

  const handleMouseUp = () => {
    finalizeSelection();
  };

  const handleTouchStart = (event) => {
    event.preventDefault();
    if (paused) return;
    const touch = event.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const c = Math.floor((touch.clientX - rect.left) / (CELL_SIZE + GAP_SIZE));
    const r = Math.floor((touch.clientY - rect.top) / (CELL_SIZE + GAP_SIZE));
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      handleMouseDown(r, c);
    }
  };

  const handleTouchMove = (event) => {
    event.preventDefault();
    if (paused || !selecting) return;
    const touch = event.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const c = Math.floor((touch.clientX - rect.left) / (CELL_SIZE + GAP_SIZE));
    const r = Math.floor((touch.clientY - rect.top) / (CELL_SIZE + GAP_SIZE));
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      handleMouseEnter(r, c);
    }
  };

  const handleTouchEnd = (event) => {
    event.preventDefault();
    finalizeSelection();
  };

  const useHint = () => {
    const remaining = words.filter((w) => !foundWords.includes(w));
    if (!remaining.length) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const placement = placements[word];
    if (!placement) return;
    const cells = [];
    for (let i = 0; i < word.length; i += 1) {
      const r = placement.row + placement.dy * i;
      const c = placement.col + placement.dx * i;
      cells.push([r, c]);
    }
    setHintCells(cells);
    setTimeout(() => setHintCells([]), 1000);
  };

  const addList = () => {
    if (!newListName.trim() || !newListWords.trim()) return;
    const wordsArr = newListWords
      .split(",")
      .map((word) => word.trim().toUpperCase())
      .filter(Boolean);
    if (!wordsArr.length) return;
    setCustomLists({
      ...customLists,
      [newListName]: {
        language: newListLang,
        words: wordsArr,
        label: newListName,
        source: "User curated list",
      },
    });
    setNewListName("");
    setNewListWords("");
  };

  const share = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("seed", seed);
    url.searchParams.set("list", listName);
    url.searchParams.set("lang", language);
    url.searchParams.set("difficulty", difficulty);
    url.searchParams.set("timer", timerMode);
    navigator.clipboard?.writeText(url.toString());
  };

  const progress = words.length
    ? Math.round((foundWords.length / words.length) * 100)
    : 0;
  const scoreLabel = words.length ? `${foundWords.length}/${words.length}` : "0/0";
  const bestTimeValue = bestTimes[difficulty];
  const highScoreDisplay =
    bestTimeValue != null ? formatTime(bestTimeValue) : '—';
  const timerDisplay =
    timerMode === "countdown"
      ? `${formatTime(time)} left`
      : `${formatTime(time)} elapsed`;
  const listOptions = useMemo(
    () =>
      Object.entries(allLists).map(([key, value]) => ({
        value: key,
        label: value.label || key.charAt(0).toUpperCase() + key.slice(1),
        language: value.language,
        source: value.source,
      })),
    [allLists],
  );
  const selectedList = listName !== "random" ? allLists[listName] : undefined;
  const listSource = selectedList?.source;

  return (
    <GameLayout
      gameId="word_search"
      score={scoreLabel}
      highScore={highScoreDisplay}
    >
      <div className="h-full w-full flex flex-col lg:flex-row bg-ub-cool-grey text-white p-4 gap-4 select-none overflow-hidden">
        <div className="flex-1 flex flex-col items-center overflow-hidden">
          <div
            className="relative"
            style={{ width: GRID_PIXELS, height: GRID_PIXELS }}
            onMouseLeave={handleMouseUp}
          >
            <div
              ref={gridRef}
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${SIZE}, 2rem)`,
                touchAction: "none",
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {grid.map((row, r) =>
                row.map((letter, c) => {
                  const isSelected = selection.some(
                    ([sr, sc]) => sr === r && sc === c,
                  );
                  const isFound = foundCells.some(
                    ([sr, sc]) => sr === r && sc === c,
                  );
                  const isHint = hintCells.some(
                    ([sr, sc]) => sr === r && sc === c,
                  );
                  return (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                      onMouseUp={handleMouseUp}
                      className={`h-8 w-8 flex items-center justify-center border border-gray-600 cursor-pointer transition-colors duration-150 ${
                        isFound
                          ? "bg-green-600"
                          : isHint
                            ? "bg-yellow-600"
                            : isSelected
                              ? "bg-blue-600"
                              : "bg-gray-700"
                      }`}
                    >
                      {letter}
                    </div>
                  );
                }),
              )}
            </div>
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={GRID_PIXELS}
              height={GRID_PIXELS}
            >
              {lassos.map((l, i) => (
                <polyline
                  key={`${l.word}-${i}`}
                  ref={(el) => (polyRefs.current[i] = el)}
                  points={l.path
                    .map(
                      ([r, c]) =>
                        `${c * (CELL_SIZE + GAP_SIZE) + CELL_SIZE / 2},${
                          r * (CELL_SIZE + GAP_SIZE) + CELL_SIZE / 2
                        }`,
                    )
                    .join(" ")}
                  stroke="rgb(250 204 21)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
          <div className="w-full max-w-xl mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between bg-gray-800/60 rounded px-3 py-2 text-sm">
              <span className="font-mono">{timerDisplay}</span>
              <span>{`Progress: ${progress}%`}</span>
              <span>{`Streak: ${streak}`}</span>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded">
              <div
                className="h-full bg-green-500 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="bg-gray-800/60 rounded p-3 overflow-y-auto max-h-48">
              <h2 className="text-xs uppercase tracking-wide text-gray-300 mb-2">
                Word Tracker
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {words.map((w) => {
                  const found = foundWords.includes(w);
                  return (
                    <li
                      key={w}
                      className={`flex items-center gap-2 ${
                        found ? "text-green-300 line-through" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                          found
                            ? "border-green-400 text-green-200"
                            : "border-gray-500 text-gray-300"
                        }`}
                      >
                        {found ? "✓" : ""}
                      </span>
                      <span>{w}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 overflow-y-auto">
          <section className="bg-gray-800/60 rounded p-3 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              Gameplay
            </h2>
            <div className="grid gap-2">
              <button
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => reset({ failed: true })}
              >
                New Puzzle
              </button>
              <button
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={useHint}
                disabled={!words.length}
              >
                Hint
              </button>
              <button
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => setSound((s) => !s)}
              >
                Sound: {sound ? "On" : "Off"}
              </button>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  onClick={share}
                >
                  Copy Share Link
                </button>
                <button
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  onClick={() => window.print()}
                >
                  Print
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              {timerMode === "countdown"
                ? `Countdown: ${formatTime(timerLimit)}`
                : "Count up mode"}
            </p>
          </section>
          <section className="bg-gray-800/60 rounded p-3 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              Puzzle Settings
            </h2>
            <label className="text-xs uppercase text-gray-400">Difficulty</label>
            <select
              className="w-full px-2 py-1 text-black rounded"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {DIFFICULTY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {DIFFICULTIES[key].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">{config.description}</p>
            <label className="text-xs uppercase text-gray-400">Language</label>
            <select
              className="w-full px-2 py-1 text-black rounded"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {Object.keys(ALPHABETS).map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            <label className="text-xs uppercase text-gray-400">Word Pack</label>
            <select
              className="w-full px-2 py-1 text-black rounded"
              value={listName}
              onChange={(e) => {
                const value = e.target.value;
                setListName(value);
                const list = allLists[value];
                if (list?.language) setLanguage(list.language);
              }}
            >
              <option value="random">Random Pack</option>
              {listOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {listSource && (
              <p className="text-xs text-gray-400">Source: {listSource}</p>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 px-2 py-1 text-black rounded"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                aria-label="Seed"
              />
              <button
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => reset({ failed: true, nextSeed: seed })}
              >
                Load
              </button>
            </div>
          </section>
          <section className="bg-gray-800/60 rounded p-3 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              Custom Lists
            </h2>
            <label
              id="word-search-custom-name-label"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-300"
              htmlFor="word-search-custom-name"
            >
              List Name
            </label>
            <input
              id="word-search-custom-name"
              className="w-full px-2 py-1 text-black rounded"
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              aria-labelledby="word-search-custom-name-label"
            />
            <label
              id="word-search-custom-lang-label"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-300"
              htmlFor="word-search-custom-lang"
            >
              Language
            </label>
            <select
              id="word-search-custom-lang"
              className="w-full px-2 py-1 text-black rounded"
              value={newListLang}
              onChange={(e) => setNewListLang(e.target.value)}
              aria-labelledby="word-search-custom-lang-label"
            >
              {Object.keys(ALPHABETS).map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            <label
              id="word-search-custom-words-label"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-300"
              htmlFor="word-search-custom-words"
            >
              Words
            </label>
            <textarea
              id="word-search-custom-words"
              className="w-full px-2 py-1 text-black rounded min-h-[96px]"
              placeholder="Comma separated words"
              value={newListWords}
              onChange={(e) => setNewListWords(e.target.value)}
              aria-labelledby="word-search-custom-words-label"
            />
            <button
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={addList}
            >
              Save List
            </button>
          </section>
        </aside>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </GameLayout>
  );
};

export default WordSearch;
