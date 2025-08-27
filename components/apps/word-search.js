import React, { useState, useEffect, useRef } from 'react';

const SIZE = 10;
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

const WORD_COUNT = 5;

const fetchTopicWords = async (topic) => {
  if (!topic) return pickWords();
  try {
    if (typeof fetch !== 'function') return pickWords();
    const res = await fetch(
      `https://api.datamuse.com/words?topics=${encodeURIComponent(
        topic,
      )}&max=100`,
    );
    const data = await res.json();
    const words = data
      .map((d) => d.word.toUpperCase())
      .filter((w) => w.length <= SIZE && /^[A-Z]+$/.test(w));
    return words.sort(() => Math.random() - 0.5).slice(0, WORD_COUNT);
  } catch {
    return pickWords();
  }
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

const pickWords = () => {
  const lists = Object.values(WORD_LISTS);
  const list = lists[Math.floor(Math.random() * lists.length)];
  return [...list]
    .sort(() => Math.random() - 0.5)
    .slice(0, WORD_COUNT);
};
const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

const generatePuzzle = (words) => {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const placements = {};

  words.forEach((word) => {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const horizontal = Math.random() < 0.5;
      const maxRow = horizontal ? SIZE : SIZE - word.length;
      const maxCol = horizontal ? SIZE - word.length : SIZE;
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

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
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
  const [puzzle, setPuzzle] = usePersistentState('wordsearch-puzzle', () =>
    generatePuzzle(pickWords()),
  );
  const { grid, placements, words } = puzzle;
  const [foundWords, setFoundWords] = usePersistentState(
    'wordsearch-found-words',
    [],
  );
  const [foundCells, setFoundCells] = usePersistentState(
    'wordsearch-found-cells',
    [],
  );
  const [time, setTime] = usePersistentState('wordsearch-time', 0);
  const [bestTime, setBestTime] = usePersistentState(
    'wordsearch-best-time',
    null,
  );
  const [topic, setTopic] = useState('');
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);
  const [hintCells, setHintCells] = useState([]);
  const [animatingCells, setAnimatingCells] = useState([]);
  const cellRefs = useRef(
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
  );
  const timerRef = useRef(null);

  const startTimer = () => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
  };

  useEffect(() => {
    startTimer();
    cellRefs.current[0][0]?.focus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (words && foundWords.length === words.length) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!bestTime || time < bestTime) {
        setBestTime(time);
      }
    }
  }, [bestTime, foundWords, time, words]);

  useEffect(() => {
    if (start && end) {
      const path = getPath(start, end);
      setSelection(path);
    }
  }, [start, end]);

  const handleMouseDown = (r, c) => {
    setStart([r, c]);
    setEnd([r, c]);
    setSelecting(true);
  };

  const handleMouseEnter = (r, c) => {
    if (selecting) setEnd([r, c]);
  };

  const handleMouseUp = () => {
    if (selection.length) {
      const letters = selection.map(([r, c]) => grid[r][c]).join('');
      const reverse = letters.split('').reverse().join('');
      const match = words.find((w) => w === letters || w === reverse);
      if (match && !foundWords.includes(match)) {
        setFoundWords([...foundWords, match]);
        setFoundCells([...foundCells, ...selection]);
        setAnimatingCells(selection);
        setTimeout(() => setAnimatingCells([]), 1000);
      }
    }
    setSelecting(false);
    setStart(null);
    setEnd(null);
    setSelection([]);
  };

  const handleKeyDown = (e, r, c) => {
    let nr = r;
    let nc = c;
    if (e.key === 'ArrowUp' && r > 0) nr = r - 1;
    else if (e.key === 'ArrowDown' && r < SIZE - 1) nr = r + 1;
    else if (e.key === 'ArrowLeft' && c > 0) nc = c - 1;
    else if (e.key === 'ArrowRight' && c < SIZE - 1) nc = c + 1;
    if (nr !== r || nc !== c) {
      e.preventDefault();
      const ref = cellRefs.current[nr][nc];
      if (ref) ref.focus();
      if (selecting) setEnd([nr, nc]);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!selecting) {
        handleMouseDown(r, c);
      } else {
        setEnd([r, c]);
        handleMouseUp();
      }
    }
  };

  const useHint = () => {
    const remaining = words.filter((w) => !foundWords.includes(w));
    if (!remaining.length) return;
    const word =
      remaining[Math.floor(Math.random() * remaining.length)];
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

  const generateFromTopic = async () => {
    const words = await fetchTopicWords(topic);
    setPuzzle(generatePuzzle(words));
    setFoundWords([]);
    setFoundCells([]);
    setTime(0);
    setHintCells([]);
    setStart(null);
    setEnd(null);
    setSelection([]);
    startTimer();
    cellRefs.current[0][0]?.focus();
  };

  const reset = () => {
    setPuzzle(generatePuzzle(pickWords()));
    setFoundWords([]);
    setFoundCells([]);
    setTime(0);
    setHintCells([]);
    setStart(null);
    setEnd(null);
    setSelection([]);
    startTimer();
    cellRefs.current[0][0]?.focus();
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 2rem)` }}
        onMouseLeave={handleMouseUp}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selection.some(([sr, sc]) => sr === r && sc === c);
            const isFound = foundCells.some(([sr, sc]) => sr === r && sc === c);
            const isHint = hintCells.some(([sr, sc]) => sr === r && sc === c);
            const isAnimating = animatingCells.some(
              ([sr, sc]) => sr === r && sc === c,
            );
            return (
              <div
                key={`${r}-${c}`}
                ref={(el) => (cellRefs.current[r][c] = el)}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, r, c)}
                onFocus={() => selecting && setEnd([r, c])}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseUp={handleMouseUp}
                className={`h-8 w-8 flex items-center justify-center border border-gray-600 cursor-pointer transition-colors duration-300 ${
                  isFound
                    ? 'bg-green-600'
                    : isHint
                    ? 'bg-yellow-600'
                    : isSelected
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                } ${isAnimating ? 'animate-pulse' : ''}`}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {words.map((w) => (
          <span key={w} className={foundWords.includes(w) ? 'line-through' : ''}>
            {w}
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="px-2 py-1 text-black"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic"
        />
        <button
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={generateFromTopic}
          disabled={!topic}
        >
          Generate
        </button>
      </div>
      <div className="mt-4 flex gap-4">
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
      </div>
      <div className="mt-2">Time: {time}s | Best: {bestTime ?? '--'}s | Found: {foundWords.length}/{words.length} | Score:{' '}
        {foundWords.length * 10 - time}
      </div>
    </div>
  );
};

export default WordSearch;

