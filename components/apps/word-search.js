import React, { useState, useEffect, useRef } from 'react';

const WORD_LISTS = {
  tech: [
    'REACT',
    'CODE',
    'TAILWIND',
    'NODE',
    'JAVASCRIPT',
    'HTML',
    'CSS',
    'PYTHON',
  ],
  animals: [
    'DOG',
    'CAT',
    'EAGLE',
    'TIGER',
    'HORSE',
    'SHARK',
    'SNAKE',
    'LION',
  ],
  fruits: [
    'APPLE',
    'BANANA',
    'ORANGE',
    'GRAPE',
    'MANGO',
    'LEMON',
    'PEACH',
    'CHERRY',
  ],
};

const DIFFICULTIES = {
  easy: { size: 10, count: 5 },
  medium: { size: 12, count: 8 },
  hard: { size: 15, count: 10 },
};

const usePersistentState = (key, initial) => {
  const [state, setState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore parse errors
        }
      }
    }
    return typeof initial === 'function' ? initial() : initial;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
};

const pickWords = (count) => {
  const lists = Object.values(WORD_LISTS);
  const list = lists[Math.floor(Math.random() * lists.length)];
  return [...list]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
};
const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

const generatePuzzle = (size, words) => {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placements = {};

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      const maxRow = horizontal ? size : size - word.length;
      const maxCol = horizontal ? size - word.length : size;
      const row = Math.floor(Math.random() * maxRow);
      const col = Math.floor(Math.random() * maxCol);

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + (horizontal ? 0 : i);
        const c = col + (horizontal ? i : 0);
        if (grid[r][c] && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          const r = row + (horizontal ? 0 : i);
          const c = col + (horizontal ? i : 0);
          grid[r][c] = word[i];
        }
        placements[word] = { row, col, horizontal };
        placed = true;
      }
    }
  });

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = randomLetter();
    }
  }

  return { grid, placements, words };
};

const getPath = (start, end) => {
  if (!start || !end) return [];
  const [sr, sc] = start;
  const [er, ec] = end;
  const path = [];
  if (sr === er) {
    const step = ec > sc ? 1 : -1;
    for (let c = sc; c !== ec + step; c += step) path.push([sr, c]);
  } else if (sc === ec) {
    const step = er > sr ? 1 : -1;
    for (let r = sr; r !== er + step; r += step) path.push([r, sc]);
  }
  return path;
};

const WordSearch = () => {
  const [difficulty, setDifficulty] = usePersistentState(
    'wordsearch-difficulty',
    'easy',
  );
  const { size: SIZE, count: WORD_COUNT } = DIFFICULTIES[difficulty];
  const [bestTimes, setBestTimes] = usePersistentState(
    'wordsearch-best-times',
    {},
  );
  const [sound, setSound] = usePersistentState('wordsearch-sound', true);

  const [puzzle, setPuzzle] = useState(() =>
    generatePuzzle(SIZE, pickWords(WORD_COUNT)),
  );
  const { grid, placements, words } = puzzle;
  const [foundWords, setFoundWords] = useState([]);
  const [foundCells, setFoundCells] = useState([]);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const timerRef = useRef(null);

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
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

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
    }
  }, [foundWords, words, time, difficulty, setBestTimes]);

  useEffect(() => {
    if (start && end) {
      const path = getPath(start, end);
      setSelection(path);
    }
  }, [start, end]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

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
      const letters = selection.map(([r, c]) => grid[r][c]).join('');
      const reverse = letters.split('').reverse().join('');
      const match = words.find((w) => w === letters || w === reverse);
      if (match && !foundWords.includes(match)) {
        setFoundWords([...foundWords, match]);
        setFoundCells([...foundCells, ...selection]);
        playBeep();
      }
    }
    setSelecting(false);
    setStart(null);
    setEnd(null);
    setSelection([]);
  };

  const useHint = () => {
    const remaining = words.filter((w) => !foundWords.includes(w));
    if (!remaining.length) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const { row, col, horizontal } = placements[word];
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      const r = row + (horizontal ? 0 : i);
      const c = col + (horizontal ? i : 0);
      cells.push([r, c]);
    }
    setHintCells(cells);
    setTimeout(() => setHintCells([]), 1000);
  };

  function reset() {
    setPuzzle(generatePuzzle(SIZE, pickWords(WORD_COUNT)));
    setFoundWords([]);
    setFoundCells([]);
    setTime(0);
    setHintCells([]);
    setStart(null);
    setEnd(null);
    setSelection([]);
    setPaused(false);
  }

  return (
    <div className="h-full w-full flex items-start justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex">
        <div
          className="grid gap-1 mr-4"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
          onMouseLeave={handleMouseUp}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const isSelected = selection.some(([sr, sc]) => sr === r && sc === c);
              const isFound = foundCells.some(([sr, sc]) => sr === r && sc === c);
              const isHint = hintCells.some(([sr, sc]) => sr === r && sc === c);
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  className={`h-8 w-8 flex items-center justify-center border border-gray-600 cursor-pointer ${
                    isFound
                      ? 'bg-green-600'
                      : isHint
                      ? 'bg-yellow-600'
                      : isSelected
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {letter}
                </div>
              );
            }),
          )}
        </div>
        <div className="flex flex-col w-48">
          <div className="mb-2">
            <div>
              Time: {time}s{' '}
              {bestTimes[difficulty] !== undefined && `| Best: ${bestTimes[difficulty]}s`}
            </div>
            <div>
              Found: {foundWords.length}/{words.length}
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-gray-600 p-2 mb-2">
            {words.map((w) => (
              <div
                key={w}
                className={foundWords.includes(w) ? 'line-through text-green-400' : ''}
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
              onClick={reset}
            >
              Reset
            </button>
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
              onClick={() => setSound((s) => !s)}
            >
              {sound ? 'Sound Off' : 'Sound On'}
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordSearch;

