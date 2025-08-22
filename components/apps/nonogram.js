import React, { useState, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import {
  evaluateLine,
  autoFillLines,
  findHint,
  validateSolution,
  getPuzzleBySeed,
} from './nonogramUtils';

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
  const [cellSize, setCellSize] = useState(32);
  const [selected, setSelected] = useState({ i: 0, j: 0 });

  const pending = useRef([]);
  const raf = useRef(null);
  const startTime = useRef(0);
  const completed = useRef(false);
  const touchTimer = useRef(null);
  const touchCross = useRef(false);

  const updateStorage = (g, r = rows, c = cols) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'nonogram-progress',
        JSON.stringify({ rows: r, cols: c, grid: g })
      );
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
    startTime.current = Date.now();
    completed.current = false;
    ReactGA.event({
      category: 'nonogram',
      action: 'puzzle_start',
      label: `${r.length}x${c.length}`,
    });
  };

  const scheduleToggle = (i, j, mode) => {
    pending.current.push({ i, j, mode });
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        setGrid((g) => {
          let ng = g.map((row) => row.slice());
          pending.current.forEach(({ i, j, mode }) => {
            if (mode === 'cross') ng[i][j] = ng[i][j] === -1 ? 0 : -1;
            else if (mode === 'pencil') ng[i][j] = ng[i][j] === 2 ? 0 : 2;
            else ng[i][j] = ng[i][j] === 1 ? 0 : 1;
          });
          pending.current = [];
          ng = autoFillLines(ng, rows, cols);
          evaluate(ng);
          updateStorage(ng);
          if (validateSolution(ng, rows, cols) && !completed.current) {
            completed.current = true;
            const time = Math.floor((Date.now() - startTime.current) / 1000);
            ReactGA.event({
              category: 'nonogram',
              action: 'puzzle_complete',
              value: time,
            });
          }
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
    setSelected({ i, j });
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

  // keyboard shortcuts
  useEffect(() => {
    if (!started) return;
    const handler = (e) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          ' ',
          'Enter',
          'x',
          'p',
          'h',
          'e',
        ].includes(e.key)
      )
        e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          setSelected((s) => ({ i: Math.max(0, s.i - 1), j: s.j }));
          break;
        case 'ArrowDown':
          setSelected((s) => ({ i: Math.min(rows.length - 1, s.i + 1), j: s.j }));
          break;
        case 'ArrowLeft':
          setSelected((s) => ({ i: s.i, j: Math.max(0, s.j - 1) }));
          break;
        case 'ArrowRight':
          setSelected((s) => ({ i: s.i, j: Math.min(cols.length - 1, s.j + 1) }));
          break;
        case ' ': // fallthrough
        case 'Enter':
          scheduleToggle(selected.i, selected.j, pencil ? 'pencil' : 'fill');
          break;
        case 'x':
          scheduleToggle(selected.i, selected.j, 'cross');
          break;
        case 'p':
          setPencil((p) => !p);
          break;
        case 'h':
          handleHint();
          break;
        case 'e':
          toggleMistakes();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, rows, cols, selected, pencil]);

  const toggleMistakes = () => {
    ReactGA.event({
      category: 'nonogram',
      action: 'error_toggle',
      value: showMistakes ? 0 : 1,
    });
    setShowMistakes(!showMistakes);
  };

  const handleHint = () => {
    const h = findHint(rows, cols, grid);
    if (h) {
      ReactGA.event({ category: 'nonogram', action: 'hint' });
      scheduleToggle(h.i, h.j, 'fill');
    } else {
      alert('No hints available');
    }
  };

  const handleTouchStart = (i, j) => {
    touchCross.current = false;
    touchTimer.current = setTimeout(() => {
      scheduleToggle(i, j, 'cross');
      touchCross.current = true;
    }, 500);
  };
  const handleTouchEnd = (i, j) => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    if (!touchCross.current) scheduleToggle(i, j, pencil ? 'pencil' : 'fill');
    touchCross.current = false;
  };

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
    alert(validateSolution(grid, rows, cols) ? 'Puzzle solved!' : 'Not yet solved');
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
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              const { rows: r, cols: c } = getPuzzleBySeed(
                new Date().toISOString().slice(0, 10)
              );
              setRowInput(r.map((row) => row.join(' ')).join('\n'));
              setColInput(c.map((col) => col.join(' ')).join('\n'));
            }}
          >
            Daily
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
              } ${
                showMistakes && rowState[i]?.contradiction ? 'text-red-500' : ''
              }`}
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
                className={`text-center ${
                  colState[i]?.solved ? 'line-through' : ''
                } ${
                  showMistakes && colState[i]?.contradiction ? 'text-red-500' : ''
                }`}
                style={{ width: cellSize }}
              >
                {clue.join(' ')}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols.length}, ${cellSize}px)` }}
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
                  onTouchStart={() => handleTouchStart(i, j)}
                  onTouchEnd={() => handleTouchEnd(i, j)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`border border-gray-600 flex items-center justify-center cursor-pointer ${
                    cell === 1 ? 'bg-gray-200' : ''
                  } ${cell === -1 ? 'text-gray-500' : ''} ${
                    cell === 2 ? 'text-gray-400' : ''
                  } ${
                    showMistakes &&
                    (rowState[i]?.contradiction || colState[j]?.contradiction)
                      ? 'bg-red-300'
                      : ''
                  } ${
                    selected.i === i && selected.j === j
                      ? 'ring-2 ring-yellow-400'
                      : ''
                  }`}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell === -1 ? 'X' : cell === 2 ? '·' : ''}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 space-x-2 flex items-center">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={validate}
        >
          Check
        </button>
        <button
          className={`px-4 py-2 rounded ${
            pencil ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          onClick={() => setPencil(!pencil)}
        >
          {pencil ? 'Pencil On' : 'Pencil Off'}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            showMistakes ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500'
          }`}
          onClick={toggleMistakes}
        >
          {showMistakes ? 'Hide Mistakes' : 'Show Mistakes'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={handleHint}
        >
          Hint
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
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setCellSize((s) => Math.max(16, s - 4))}
        >
          -
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setCellSize((s) => Math.min(64, s + 4))}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Nonogram;
