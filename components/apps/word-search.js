import React, { useState, useEffect, useRef } from "react";
import seedrandom from "seedrandom";
import useOPFS from "../../hooks/useOPFS.js";
import { copyToClipboard } from "../../utils/clipboard";

// Approximate pixel size of each grid cell for SVG overlay calculations
const CELL_SIZE = 32;
const GAP_SIZE = 4; // grid gap-1 in pixels

const DEFAULT_LISTS = {
  tech: {
    language: "en",
    words: [
      "REACT",
      "CODE",
      "TAILWIND",
      "NODE",
      "JAVASCRIPT",
      "HTML",
      "CSS",
      "PYTHON",
    ],
  },
  animals: {
    language: "en",
    words: ["DOG", "CAT", "EAGLE", "TIGER", "HORSE", "SHARK", "SNAKE", "LION"],
  },
  fruits: {
    language: "en",
    words: [
      "APPLE",
      "BANANA",
      "ORANGE",
      "GRAPE",
      "MANGO",
      "LEMON",
      "PEACH",
      "CHERRY",
    ],
  },
  colors: {
    language: "en",
    words: [
      "RED",
      "BLUE",
      "GREEN",
      "YELLOW",
      "PURPLE",
      "ORANGE",
      "BLACK",
      "WHITE",
    ],
  },
};

const ALPHABETS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
  fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  de: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

const DIFFICULTIES = {
  easy: { size: 10, count: 5 },
  medium: { size: 12, count: 8 },
  hard: { size: 15, count: 10 },
};

const MIN_TIME_LIMIT = 30;
const MAX_TIME_LIMIT = 600;

const parseBooleanParam = (value) => {
  if (value === null) return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === "1" || normalized === "true") return true;
  if (normalized === "0" || normalized === "false") return false;
  return undefined;
};

const cleanWordToken = (word, alphabet) => {
  if (!word) return "";
  const allowed = new Set(alphabet.split(""));
  const upper = word.trim().toUpperCase();
  return upper
    .split("")
    .filter((ch) => allowed.has(ch))
    .join("");
};

export const parseWordSearchPermalink = (urlOrQuery) => {
  const raw = String(urlOrQuery || "");
  const query = raw.includes("?") ? raw.split("?")[1] : raw;
  const params = new URLSearchParams(query);
  const parsed = {};

  const seed = params.get("seed")?.trim();
  if (seed) parsed.seed = seed;

  const difficulty = params.get("difficulty");
  if (difficulty && DIFFICULTIES[difficulty]) {
    parsed.difficulty = difficulty;
  }

  const language = params.get("lang");
  if (language && ALPHABETS[language]) {
    parsed.language = language;
  }

  const diagonals = parseBooleanParam(params.get("diagonals"));
  if (diagonals !== undefined) parsed.diagonals = diagonals;

  const challenge = parseBooleanParam(params.get("challenge"));
  if (challenge !== undefined) parsed.challenge = challenge;

  const rawLimit = Number(params.get("limit"));
  if (
    Number.isFinite(rawLimit) &&
    rawLimit >= MIN_TIME_LIMIT &&
    rawLimit <= MAX_TIME_LIMIT
  ) {
    parsed.timeLimit = rawLimit;
  }

  const listName = params.get("list")?.trim();
  if (listName) parsed.listName = listName;

  const alphabet = ALPHABETS[parsed.language || "en"];
  const rawWords = params.get("words");
  if (rawWords !== null) {
    const words = rawWords
      .split(",")
      .map((word) => cleanWordToken(word, alphabet))
      .filter(Boolean);
    if (words.length) {
      parsed.wordsOverride = words;
    }
  }

  return parsed;
};

const usePersistentState = (key, initial) => {
  const [state, setState] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore parse errors
        }
      }
    }
    return typeof initial === "function" ? initial() : initial;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
};

const pickWords = (count, list, rng, lists, language) => {
  let pool;
  if (list && lists[list]) {
    pool = lists[list].words;
  } else {
    const available = Object.values(lists).filter(
      (l) => !language || l.language === language,
    );
    const chosen = available[Math.floor(rng() * available.length)]?.words || [];
    pool = chosen;
  }
  return [...pool].sort(() => rng() - 0.5).slice(0, count);
};
const randomLetter = (rng, alphabet) =>
  alphabet[Math.floor(rng() * alphabet.length)];

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

export const generatePuzzle = (
  size,
  words,
  rng,
  alphabet,
  diagonals = true,
) => {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = {};

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dirs = diagonals ? ALL_DIRECTIONS : ORTHO_DIRECTIONS;
      const dir = dirs[Math.floor(rng() * dirs.length)];
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
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dy * i;
        const c = col + dir.dx * i;
        if (grid[r][c] && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          const r = row + dir.dy * i;
          const c = col + dir.dx * i;
          grid[r][c] = word[i];
        }
        placements[word] = { row, col, dx: dir.dx, dy: dir.dy };
        placed = true;
      }
    }
  });

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
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
  if (dx !== 0 && dy !== 0 && Math.abs(ec - sc) !== Math.abs(er - sr))
    return [];
  const path = [];
  for (let i = 0; i <= len; i++) {
    path.push([sr + dy * i, sc + dx * i]);
  }
  return path;
};

const WordSearch = () => {
  const [difficulty, setDifficulty] = usePersistentState(
    "wordsearch-difficulty",
    "easy",
  );
  const [listName, setListName] = usePersistentState(
    "wordsearch-list",
    "random",
  );
  const [language, setLanguage] = usePersistentState(
    "wordsearch-language",
    "en",
  );
  const [seed, setSeed] = usePersistentState("wordsearch-seed", () =>
    Math.random().toString(36).slice(2, 10),
  );
  const [customLists, setCustomLists, listsReady] = useOPFS(
    "wordsearch-lists.json",
    {},
  );
  const allLists = { ...DEFAULT_LISTS, ...customLists };
  const { size: SIZE } = DIFFICULTIES[difficulty];
  const [bestTimes, setBestTimes] = usePersistentState(
    "wordsearch-best-times",
    {},
  );
  const [sound, setSound] = usePersistentState("wordsearch-sound", true);
  const [diagonals, setDiagonals] = usePersistentState(
    "wordsearch-diagonals",
    true,
  );
  const [challenge, setChallenge] = usePersistentState(
    "wordsearch-challenge",
    false,
  );
  const [timeLimit, setTimeLimit] = usePersistentState(
    "wordsearch-time-limit",
    120,
  );
  const [streak, setStreak] = usePersistentState("wordsearch-streak", 0);
  const [newListName, setNewListName] = useState("");
  const [newListWords, setNewListWords] = useState("");
  const [newListLang, setNewListLang] = useState("en");

  const [puzzle, setPuzzle] = useState({ grid: [], placements: {}, words: [] });
  const { grid, placements, words } = puzzle;
  const GRID_PIXELS = SIZE * (CELL_SIZE + GAP_SIZE) - GAP_SIZE;
  const [foundWords, setFoundWords] = useState([]);
  const [foundCells, setFoundCells] = useState([]);
  const [time, setTime] = useState(challenge ? timeLimit : 0);
  const [paused, setPaused] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const [lassos, setLassos] = useState([]);
  const polyRefs = useRef([]);
  const prefersReducedMotion = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const [shareFallbackUrl, setShareFallbackUrl] = useState("");
  const timerRef = useRef(null);
  const gridRef = useRef(null);
  const skipNextAutoResetRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (!listsReady) return;
    const parsed =
      typeof window !== "undefined"
        ? parseWordSearchPermalink(window.location.search)
        : {};
    skipNextAutoResetRef.current = true;
    reset({ failed: true, ...parsed, seed: parsed.seed || seed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listsReady]);

  const playBeep = () => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 150);
    } catch {
      // ignore audio errors
    }
  };

  useEffect(() => {
    if (!paused) {
      timerRef.current = setInterval(
        () => setTime((t) => (challenge ? t - 1 : t + 1)),
        1000,
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, challenge]);

  useEffect(() => {
    if (challenge && time <= 0) {
      setStreak(0);
      reset({ failed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, time]);

  useEffect(() => {
    if (words.length && foundWords.length === words.length) {
      setPaused(true);
      setBestTimes((bt) => {
        const best = bt[difficulty];
        if (!best || time < best) {
          return { ...bt, [difficulty]: time };
        }
        return bt;
      });
      setStreak((s) => s + 1);
      setTimeout(() => reset({ failed: false }), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundWords, words, time, difficulty, setBestTimes]);

  useEffect(() => {
    if (start && end) {
      const path = getPath(start, end);
      setSelection(path);
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
    if (!listsReady) return;
    if (skipNextAutoResetRef.current) {
      skipNextAutoResetRef.current = false;
      return;
    }
    reset({ failed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, listName, challenge, timeLimit, language, listsReady]);

  const handleMouseDown = (r, c) => {
    if (paused) return;
    setStart([r, c]);
    setEnd([r, c]);
    setSelecting(true);
  };

  const handleMouseEnter = (r, c) => {
    if (paused) return;
    if (selecting) setEnd([r, c]);
  };

  const handleMouseUp = () => {
    if (selection.length && !paused) {
      const letters = selection.map(([r, c]) => grid[r][c]).join("");
      const reverse = letters.split("").reverse().join("");
      const match = words.find((w) => w === letters || w === reverse);
      if (match && !foundWords.includes(match)) {
        setFoundWords([...foundWords, match]);
        setFoundCells([...foundCells, ...selection]);
        setLassos((ls) => [...ls, { word: match, path: selection }]);
        setAnnouncement(`${match} found`);
        playBeep();
      }
    }
    setSelecting(false);
    setStart(null);
    setEnd(null);
    setSelection([]);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (paused) return;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const c = Math.floor((touch.clientX - rect.left) / (CELL_SIZE + GAP_SIZE));
    const r = Math.floor((touch.clientY - rect.top) / (CELL_SIZE + GAP_SIZE));
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      handleMouseDown(r, c);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (paused || !selecting) return;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const c = Math.floor((touch.clientX - rect.left) / (CELL_SIZE + GAP_SIZE));
    const r = Math.floor((touch.clientY - rect.top) / (CELL_SIZE + GAP_SIZE));
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      handleMouseEnter(r, c);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  const useHint = () => {
    const remaining = words.filter((w) => !foundWords.includes(w));
    if (!remaining.length) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const { row, col, dx, dy } = placements[word];
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const r = row + dy * i;
      const c = col + dx * i;
      cells.push([r, c]);
    }
    setHintCells(cells);
    setTimeout(() => setHintCells([]), 1000);
  };

  const addList = () => {
    if (!newListName.trim() || !newListWords.trim()) return;
    const wordsArr = newListWords
      .split(",")
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    if (!wordsArr.length) return;
    setCustomLists({
      ...customLists,
      [newListName]: { language: newListLang, words: wordsArr },
    });
    setNewListName("");
    setNewListWords("");
  };

  const share = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("seed", seed);
    url.searchParams.set("difficulty", difficulty);
    url.searchParams.set("diagonals", diagonals ? "1" : "0");
    url.searchParams.set("challenge", challenge ? "1" : "0");
    url.searchParams.set("limit", String(timeLimit));
    url.searchParams.set("list", listName);
    url.searchParams.set("lang", language);
    if (words.length) {
      url.searchParams.set("words", words.join(","));
    } else {
      url.searchParams.delete("words");
    }
    const permalink = url.toString();
    copyToClipboard(permalink).then((copied) => {
      if (copied) {
        setShareFallbackUrl("");
        setAnnouncement("Link copied to clipboard");
        return;
      }
      setShareFallbackUrl(permalink);
      setAnnouncement("Unable to copy link");
    });
  };

  function reset(options = {}) {
    const {
      failed = true,
      seed: seedOverride,
      diagonals: diagonalsOverride,
      difficulty: difficultyOverride,
      language: languageOverride,
      challenge: challengeOverride,
      timeLimit: timeLimitOverride,
      listName: listNameOverride,
      wordsOverride,
    } = options;

    const effectiveDifficulty =
      difficultyOverride && DIFFICULTIES[difficultyOverride]
        ? difficultyOverride
        : difficulty;
    const effectiveLanguage =
      languageOverride && ALPHABETS[languageOverride] ? languageOverride : language;
    const effectiveChallenge =
      challengeOverride !== undefined ? challengeOverride : challenge;
    const effectiveTimeLimit =
      timeLimitOverride !== undefined ? timeLimitOverride : timeLimit;
    const effectiveDiagonals =
      diagonalsOverride !== undefined ? diagonalsOverride : diagonals;
    const requestedListName =
      listNameOverride !== undefined ? listNameOverride : listName;
    const effectiveListName =
      requestedListName === "random" || allLists[requestedListName]
        ? requestedListName
        : "random";
    const { size: effectiveSize, count: effectiveWordCount } =
      DIFFICULTIES[effectiveDifficulty] || DIFFICULTIES.easy;

    const s = seedOverride || Math.random().toString(36).slice(2, 10);
    setSeed(s);
    if (difficultyOverride && difficultyOverride !== difficulty) {
      setDifficulty(effectiveDifficulty);
    }
    if (languageOverride && effectiveLanguage !== language) {
      setLanguage(effectiveLanguage);
    }
    if (challengeOverride !== undefined && effectiveChallenge !== challenge) {
      setChallenge(effectiveChallenge);
    }
    if (timeLimitOverride !== undefined && effectiveTimeLimit !== timeLimit) {
      setTimeLimit(effectiveTimeLimit);
    }
    if (diagonalsOverride !== undefined && effectiveDiagonals !== diagonals) {
      setDiagonals(effectiveDiagonals);
    }
    if (listNameOverride !== undefined && effectiveListName !== listName) {
      setListName(effectiveListName);
    }

    const rng = seedrandom(s);
    const chosenWords =
      wordsOverride && wordsOverride.length
        ? wordsOverride
        : pickWords(
            effectiveWordCount,
            effectiveListName === "random" ? undefined : effectiveListName,
            rng,
            allLists,
            effectiveLanguage,
          );

    setPuzzle(
      generatePuzzle(
        effectiveSize,
        chosenWords,
        rng,
        ALPHABETS[effectiveLanguage] || ALPHABETS.en,
        effectiveDiagonals,
      ),
    );
    setFoundWords([]);
    setFoundCells([]);
    setTime(effectiveChallenge ? effectiveTimeLimit : 0);
    setHintCells([]);
    setStart(null);
    setEnd(null);
    setSelection([]);
    setLassos([]);
    polyRefs.current = [];
    setAnnouncement("");
    setPaused(false);
    if (failed) setStreak(0);
  }

  return (
    <div className="h-full w-full flex items-start justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex">
        <div
          className="relative mr-4"
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
                    className={`h-8 w-8 flex items-center justify-center border border-gray-600 cursor-pointer ${
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
                key={l.word}
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
        <div className="flex flex-col w-48">
          <div className="mb-2">
            <div>
              Time: {time}s{" "}
              {bestTimes[difficulty] !== undefined &&
                `| Best: ${bestTimes[difficulty]}s`}
            </div>
            <div>
              Found: {foundWords.length}/{words.length}
            </div>
            <div>Streak: {streak}</div>
          </div>
          <div className="flex-1 overflow-auto border border-gray-600 p-2 mb-2">
            {words.map((w) => (
              <div
                key={w}
                className={
                  foundWords.includes(w) ? "line-through text-green-400" : ""
                }
              >
                {w}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={useHint}
            >
              Hint
            </button>
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={() => reset({ failed: true })}
            >
              New Puzzle
            </button>
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={() => setSound((s) => !s)}
            >
              {sound ? "Sound Off" : "Sound On"}
            </button>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={diagonals}
                aria-label="Allow diagonals"
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDiagonals(checked);
                  reset({ failed: true, diagonals: checked });
                }}
              />
              <span>Allow Diagonals</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={challenge}
                aria-label="Timed mode"
                onChange={(e) => setChallenge(e.target.checked)}
              />
              <span>Timed Mode</span>
            </label>
            {challenge && (
              <select
                className="px-2 py-1 text-black"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              >
                <option value={60}>60s</option>
                <option value={120}>120s</option>
                <option value={180}>180s</option>
              </select>
            )}
            <div className="flex gap-1">
              <input
                className="px-2 py-1 text-black flex-1"
                value={seed}
                aria-label="Puzzle seed"
                onChange={(e) => setSeed(e.target.value)}
              />
              <button
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
                onClick={() => reset({ failed: true, seed })}
              >
                Load
              </button>
            </div>
            {shareFallbackUrl && (
              <input
                className="px-2 py-1 text-black"
                value={shareFallbackUrl}
                readOnly
                aria-label="Share link"
              />
            )}
            <div className="flex gap-1">
              <button
                className="flex-1 px-4 py-1 bg-gray-700 hover:bg-gray-600"
                onClick={share}
              >
                Share
              </button>
              <button
                className="flex-1 px-4 py-1 bg-gray-700 hover:bg-gray-600"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
            <select
              className="px-2 py-1 text-black"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
            <select
              className="px-2 py-1 text-black"
              value={listName}
              onChange={(e) => {
                setListName(e.target.value);
                const l = allLists[e.target.value];
                if (l?.language) setLanguage(l.language);
              }}
            >
              <option value="random">Random List</option>
              {Object.keys(allLists).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <select
              className="px-2 py-1 text-black"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {Object.keys(DIFFICULTIES).map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
            <div className="border border-gray-600 p-2 flex flex-col gap-1">
              <input
                className="px-1 text-black"
                placeholder="List name"
                value={newListName}
                aria-label="Custom list name"
                onChange={(e) => setNewListName(e.target.value)}
              />
              <select
                className="px-2 py-1 text-black"
                value={newListLang}
                onChange={(e) => setNewListLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
              <textarea
                className="px-1 text-black"
                placeholder="Comma separated words"
                value={newListWords}
                aria-label="Custom list words"
                onChange={(e) => setNewListWords(e.target.value)}
              />
              <button
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
                onClick={addList}
              >
                Save List
              </button>
            </div>
          </div>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default WordSearch;
