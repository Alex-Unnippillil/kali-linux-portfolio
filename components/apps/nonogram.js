import React, { useState, useEffect, useRef } from 'react';

const parseClues = (text) =>
  text
    .trim()
    .split('\n')
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => parseInt(n, 10))
    );

const lineToClues = (line) => {
  const clues = [];
  let count = 0;
  line.forEach((cell) => {
    if (cell === 1) count += 1;
    else if (count) {
      clues.push(count);
      count = 0;
    }
  });
  if (count) clues.push(count);
  return clues.length ? clues : [];
};

const evaluateLine = (line, clue) => {
  const clues = lineToClues(line);
  const solved = JSON.stringify(clues) === JSON.stringify(clue);
  let contradiction = false;
  for (let i = 0; i < clues.length; i++) {
    if (i >= clue.length || clues[i] > clue[i]) contradiction = true;
  }
  if (clues.length > clue.length) contradiction = true;
  return { solved, contradiction };
};

const generateLinePatterns = (clue, length, prefix = []) => {
  if (!clue.length) return [Array(length).fill(0)];
  const [first, ...rest] = clue;
  const patterns = [];
  for (let offset = 0; offset <= length - first; offset++) {
    const head = Array(offset).fill(0).concat(Array(first).fill(1));
    if (rest.length) {
      const tails = generateLinePatterns(rest, length - offset - first - 1);
      tails.forEach((t) => patterns.push(head.concat([0], t)));
    } else if (head.length < length) {
      patterns.push(head.concat(Array(length - head.length).fill(0)));
    } else patterns.push(head);
  }
  return patterns;
};

const solveNonogram = (rows, cols) => {
  const rowPatterns = rows.map((clue) => generateLinePatterns(clue, cols.length));
  let count = 0;
  const grid = Array(rows.length)
    .fill(null)
    .map(() => Array(cols.length).fill(0));

  const backtrack = (r) => {
    if (r === rows.length) {
      const colsValid = cols.every((clue, i) =>
        JSON.stringify(lineToClues(grid.map((row) => row[i]))) ===
        JSON.stringify(clue)
      );
      if (colsValid) count += 1;
      return;
    }
    rowPatterns[r].forEach((pattern) => {
      grid[r] = pattern;
      let ok = true;
      for (let j = 0; j < cols.length && ok; j++) {
        const colClue = cols[j];
        const col = grid.slice(0, r + 1).map((row) => row[j]);
        const cClues = lineToClues(col);
        for (let k = 0; k < cClues.length; k++) {
          if (k >= colClue.length || cClues[k] > colClue[k]) {
            ok = false;
            break;
          }
        }
        if (cClues.length > colClue.length) ok = false;
      }
      if (ok) backtrack(r + 1);
    });
  };
  backtrack(0);
  return count;
};

const Nonogram = () => {
  const [rowInput, setRowInput] = useState('1\n3\n5\n3\n1');
  const [colInput, setColInput] = useState('1 1\n3\n5\n3\n1 1');
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [grid, setGrid] = useState([]);
  const [rowState, setRowState] = useState([]);
  const [colState, setColState] = useState([]);
  const [started, setStarted] = useState(false);
  const [pencil, setPencil] = useState(false);
  const [showMistakes, setShowMistakes] = useState(true);
  const pending = useRef([]);
  const raf = useRef(null);

  const updateStorage = (g, r = rows, c = cols) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nonogram-progress', JSON.stringify({ rows: r, cols: c, grid: g }));
    }
  };

  const evaluate = (g) => {
    setRowState(rows.map((clue, i) => evaluateLine(g[i], clue)));
    setColState(
      cols.map((clue, i) => {
        const column = g.map((row) => row[i]);
        return evaluateLine(column, clue);
      })
    );
  };

  const startGame = () => {
    const r = parseClues(rowInput);
    const c = parseClues(colInput);
    if (!r.length || !c.length) return;
    setRows(r);
    setCols(c);
    const g = Array(r.length)
      .fill(null)
      .map(() => Array(c.length).fill(0));
    setGrid(g);
    evaluate(g);
    updateStorage(g, r, c);
    setStarted(true);
    const solutions = solveNonogram(r, c);
    if (solutions !== 1) alert('Warning: puzzle does not have a unique solution');
  };

  const scheduleToggle = (i, j, mode) => {
    pending.current.push({ i, j, mode });
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        setGrid((g) => {
          const ng = g.map((row) => row.slice());
          pending.current.forEach(({ i, j, mode }) => {
            if (mode === 'cross') ng[i][j] = ng[i][j] === -1 ? 0 : -1;
            else if (mode === 'pencil') ng[i][j] = ng[i][j] === 2 ? 0 : 2;
            else ng[i][j] = ng[i][j] === 1 ? 0 : 1;
          });
          pending.current = [];
          evaluate(ng);
          updateStorage(ng);
          return ng;
        });
        raf.current = null;
      });
    }
  };

  const painting = useRef(false);
  const paintMode = useRef('fill');

  const handleMouseDown = (i, j, mode) => {
    painting.current = true;
    paintMode.current = mode;
    scheduleToggle(i, j, mode);
  };
  const handleMouseEnter = (i, j) => {
    if (painting.current) scheduleToggle(i, j, paintMode.current);
  };
  useEffect(() => {
    const up = () => {
      painting.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('nonogram-progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.rows && data.cols && data.grid) {
          setRows(data.rows);
          setCols(data.cols);
          setGrid(data.grid);
          evaluate(data.grid);
          setStarted(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const validate = () => {
    const rowsValid = grid.every((row, i) =>
      JSON.stringify(lineToClues(row)) === JSON.stringify(rows[i])
    );
    const colsValid = cols.every((col, i) => {
      const column = grid.map((row) => row[i]);
      return JSON.stringify(lineToClues(column)) === JSON.stringify(col);
    });
    alert(rowsValid && colsValid ? 'Puzzle solved!' : 'Not yet solved');
  };

  if (!started)
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <div className="flex mb-4 space-x-4">
          <textarea
            className="bg-gray-700 p-2"
            rows={5}
            value={rowInput}
            onChange={(e) => setRowInput(e.target.value)}
            placeholder="Row clues"
          />
          <textarea
            className="bg-gray-700 p-2"
            rows={5}
            value={colInput}
            onChange={(e) => setColInput(e.target.value)}
            placeholder="Column clues"
          />
        </div>
        <div className="space-x-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={startGame}
          >
            Start
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              const data = prompt('Paste puzzle seed');
              if (!data) return;
              try {
                const p = JSON.parse(data);
                if (p.rows && p.cols) {
                  setRowInput(p.rows.map((r) => r.join(' ')).join('\n'));
                  setColInput(p.cols.map((c) => c.join(' ')).join('\n'));
                  if (p.grid) {
                    setRows(p.rows);
                    setCols(p.cols);
                    setGrid(p.grid);
                    evaluate(p.grid);
                    setStarted(true);
                    updateStorage(p.grid, p.rows, p.cols);
                  }
                }
              } catch (e) {
                alert('Invalid seed');
              }
            }}
          >
            Import
          </button>
        </div>
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex">
        <div className="flex flex-col mr-2 text-right">
          {rows.map((clue, i) => (
            <div
              key={i}
              className={`h-8 flex items-center justify-end pr-1 ${
                rowState[i]?.solved ? 'line-through' : ''
              } ${showMistakes && rowState[i]?.contradiction ? 'text-red-500' : ''}`}
            >
              {clue.join(' ')}
            </div>
          ))}
        </div>
        <div>
          <div className="flex mb-1">
            {cols.map((clue, i) => (
              <div
                key={i}
                className={`w-8 text-center ${
                  colState[i]?.solved ? 'line-through' : ''
                } ${showMistakes && colState[i]?.contradiction ? 'text-red-500' : ''}`}
              >
                {clue.join(' ')}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols.length}, 2rem)` }}
          >
            {grid.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const mode =
                      e.button === 2
                        ? 'cross'
                        : pencil
                        ? 'pencil'
                        : 'fill';
                    handleMouseDown(i, j, mode);
                  }}
                  onMouseEnter={() => handleMouseEnter(i, j)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-8 h-8 border border-gray-600 flex items-center justify-center cursor-pointer ${
                    cell === 1 ? 'bg-gray-200' : ''
                  } ${cell === -1 ? 'text-gray-500' : ''} ${
                    cell === 2 ? 'text-gray-400' : ''
                  } ${
                    showMistakes && (rowState[i]?.contradiction || colState[j]?.contradiction)
                      ? 'bg-red-300'
                      : ''
                  }`}
                >
                  {cell === -1 ? 'X' : cell === 2 ? '·' : ''}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 space-x-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={validate}
        >
          Check
        </button>
        <button
          className={`px-4 py-2 rounded ${pencil ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          onClick={() => setPencil(!pencil)}
        >
          {pencil ? 'Pencil On' : 'Pencil Off'}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            showMistakes ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500'
          }`}
          onClick={() => setShowMistakes(!showMistakes)}
        >
          {showMistakes ? 'Hide Mistakes' : 'Show Mistakes'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            const data = JSON.stringify({ rows, cols, grid });
            if (navigator.clipboard) navigator.clipboard.writeText(data);
            alert('Puzzle copied to clipboard');
          }}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default Nonogram;
