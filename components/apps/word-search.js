import React, { useState, useEffect } from 'react';

const SIZE = 10;
const WORDS = ['REACT', 'CODE', 'TAILWIND', 'NODE', 'JS'];

const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

const generatePuzzle = () => {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const placements = {};

  WORDS.forEach((word) => {
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

  return { grid, placements };
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
  const [{ grid }, setPuzzle] = useState(generatePuzzle);
  const [foundWords, setFoundWords] = useState([]);
  const [foundCells, setFoundCells] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState([]);

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
      const match = WORDS.find((w) => w === letters || w === reverse);
      if (match && !foundWords.includes(match)) {
        setFoundWords([...foundWords, match]);
        setFoundCells([...foundCells, ...selection]);
      }
    }
    setSelecting(false);
    setStart(null);
    setEnd(null);
    setSelection([]);
  };

  const reset = () => {
    setPuzzle(generatePuzzle());
    setFoundWords([]);
    setFoundCells([]);
    setStart(null);
    setEnd(null);
    setSelection([]);
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
            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseUp={handleMouseUp}
                className={`h-8 w-8 flex items-center justify-center border border-gray-600 cursor-pointer ${isFound ? 'bg-green-600' : isSelected ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {WORDS.map((w) => (
          <span key={w} className={foundWords.includes(w) ? 'line-through' : ''}>
            {w}
          </span>
        ))}
      </div>
      <button className="mt-4 px-4 py-1 bg-gray-700 hover:bg-gray-600" onClick={reset}>
        Reset
      </button>
    </div>
  );
};

export default WordSearch;

