import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  validateSolution,
  puzzles,
  findForcedCellsInLine,
  getPossibleLineSolutions,
} from './nonogramUtils';

// basic logical line solver used for tests and hinting
export const solveLines = (rows, cols, inputGrid) => {
  const height = rows.length;
  const width = cols.length;
  const grid = inputGrid
    ? inputGrid.map((r) => r.slice())
    : Array(height)
        .fill(0)
        .map(() => Array(width).fill(0));
  const contradictions = {
    rows: Array(height).fill(false),
    cols: Array(width).fill(false),
  };
  let changed = true;
  while (changed) {
    changed = false;
    rows.forEach((clue, i) => {
      const line = grid[i];
      const poss = getPossibleLineSolutions(clue, line);
      contradictions.rows[i] = poss.length === 0;
      if (poss.length === 0) return;
      const forced = findForcedCellsInLine(clue, line);
      forced.forEach(({ index, value }) => {
        if (grid[i][index] !== value) {
          grid[i][index] = value;
          changed = true;
        }
      });
    });
    cols.forEach((clue, j) => {
      const col = grid.map((row) => row[j]);
      const poss = getPossibleLineSolutions(clue, col);
      contradictions.cols[j] = poss.length === 0;
      if (poss.length === 0) return;
      const forced = findForcedCellsInLine(clue, col);
      forced.forEach(({ index, value }) => {
        if (grid[index][j] !== value) {
          grid[index][j] = value;
          changed = true;
        }
      });
    });
  }
  return { grid, contradictions };
};

export const solveNonogram = (rows, cols) => {
  const height = rows.length;
  const width = cols.length;
  const attempt = (g, guessed) => {
    const { grid, contradictions } = solveLines(rows, cols, g);
    if (contradictions.rows.some(Boolean) || contradictions.cols.some(Boolean)) {
      return null;
    }
    if (validateSolution(grid, rows, cols)) {
      return { grid, usedGuess: guessed };
    }
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (grid[i][j] === 0) {
          const g1 = grid.map((r) => r.slice());
          g1[i][j] = 1;
          const r1 = attempt(g1, true);
          if (r1) return r1;
          const g2 = grid.map((r) => r.slice());
          g2[i][j] = -1;
          return attempt(g2, true);
        }
      }
    }
    return null;
  };
  return attempt(null, false);
};

// visual settings
const CELL_SIZE = 30;
const CLUE_SPACE = 60; // space for row/column clues around grid

// use a small sample puzzle
const PUZZLE = puzzles[1]; // Diamond 5x5

const Nonogram = () => {
  const rows = PUZZLE.rows;
  const cols = PUZZLE.cols;
  const height = rows.length;
  const width = cols.length;
  const solution = PUZZLE.grid;

  // progress tracking
  const [rowTargets, setRowTargets] = useState(Array(height).fill(0));
  const [colTargets, setColTargets] = useState(Array(width).fill(0));
  const [rowErrors, setRowErrors] = useState(Array(height).fill(false));
  const [colErrors, setColErrors] = useState(Array(width).fill(false));
  const rowProgress = useRef(Array(height).fill(0));
  const colProgress = useRef(Array(width).fill(0));
  const rowCross = useRef(Array(height).fill(0));
  const colCross = useRef(Array(width).fill(0));
  const rowPulse = useRef(Array(height).fill(0));
  const colPulse = useRef(Array(width).fill(0));
  const prevRow = useRef(Array(height).fill(0));
  const prevCol = useRef(Array(width).fill(0));
  const [liveMessage, setLiveMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  // grid: 0 empty, 1 filled, -1 marked
  const [grid, setGrid] = useState(
    () => Array(height).fill(0).map(() => Array(width).fill(0))
  );
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const canvasRef = useRef(null);
  const animationRef = useRef();

  const [mode, setMode] = useState('paint'); // paint or mark
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [preventIllegal, setPreventIllegal] = useState(false);
  const [time, setTime] = useState(0);
  const [highScore, setHighScore] = useState(null);
  const startTime = useRef(Date.now());
  const completed = useRef(false);

  // load stored high score
  useEffect(() => {
    const hs = localStorage.getItem('nonogramHighScore');
    if (hs) setHighScore(parseInt(hs, 10));
    reset();
  }, [reset]);

  const playSound = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      /* ignore */
    }
  }, [sound]);

  const checkSolved = useCallback(
    (ng) => {
      if (validateSolution(ng, rows, cols) && !completed.current) {
        completed.current = true;
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        setTime(elapsed);
        if (highScore === null || elapsed < highScore) {
          localStorage.setItem('nonogramHighScore', String(elapsed));
          setHighScore(elapsed);
        }
        playSound();
        alert('Puzzle solved!');
      }
    },
    [rows, cols, highScore, playSound]
  );

  const setCellValue = useCallback(
    (i, j, value) => {
      if (paused || completed.current) return;
      setGrid((g) => {
        const ng = g.map((row) => row.slice());
        if (preventIllegal) {
          if (value === 1 && solution[i][j] !== 1) return g;
          if (value === -1 && solution[i][j] === 1) return g;
        }
        if (ng[i][j] === value) return g;
        ng[i][j] = value;
        checkSolved(ng);
        return ng;
      });
      playSound();
    },
    [paused, preventIllegal, solution, checkSolved, playSound]
  );

  const reset = useCallback(() => {
    setGrid(Array(height).fill(0).map(() => Array(width).fill(0)));
    startTime.current = Date.now();
    setTime(0);
    completed.current = false;
    setPaused(false);
  }, [height, width]);

  // respect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // update progress targets when grid changes
  useEffect(() => {
    const newRowTargets = rows.map((clue, i) => {
      let correct = 0;
      let total = 0;
      let error = false;
      for (let j = 0; j < width; j++) {
        if (solution[i][j] === 1) {
          total += 1;
          if (grid[i][j] === 1) correct += 1;
        } else if (grid[i][j] === 1) {
          correct -= 1;
          error = true;
        }
      }
      if (getPossibleLineSolutions(clue, grid[i]).length === 0) error = true;
      return { target: total ? Math.max(0, Math.min(1, correct / total)) : 1, error };
    });
    const newColTargets = cols.map((clue, j) => {
      let correct = 0;
      let total = 0;
      let error = false;
      for (let i = 0; i < height; i++) {
        if (solution[i][j] === 1) {
          total += 1;
          if (grid[i][j] === 1) correct += 1;
        } else if (grid[i][j] === 1) {
          correct -= 1;
          error = true;
        }
      }
      const col = grid.map((row) => row[j]);
      if (getPossibleLineSolutions(clue, col).length === 0) error = true;
      return { target: total ? Math.max(0, Math.min(1, correct / total)) : 1, error };
    });
    setRowTargets(newRowTargets.map((r) => r.target));
    setColTargets(newColTargets.map((c) => c.target));
    setRowErrors(newRowTargets.map((r) => r.error));
    setColErrors(newColTargets.map((c) => c.error));
    let message = '';
    newRowTargets.forEach(({ target }, i) => {
      if (target === 1 && prevRow.current[i] < 1) {
        message = `Row ${i + 1} solved`;
        rowPulse.current[i] = 30;
      }
      prevRow.current[i] = target;
    });
    newColTargets.forEach(({ target }, j) => {
      if (target === 1 && prevCol.current[j] < 1) {
        message = `Column ${j + 1} solved`;
        colPulse.current[j] = 30;
      }
      prevCol.current[j] = target;
    });
    if (message) setLiveMessage(message);
  }, [grid, rows, cols, height, width, solution]);

  // canvas drawing with rAF
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = CLUE_SPACE + width * CELL_SIZE + 1;
    canvas.height = CLUE_SPACE + height * CELL_SIZE + 1;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // animate progress toward targets
      rowProgress.current = rowProgress.current.map((p, i) => {
        const target = rowTargets[i];
        return reduceMotion ? target : p + (target - p) * 0.1;
      });
      colProgress.current = colProgress.current.map((p, j) => {
        const target = colTargets[j];
        return reduceMotion ? target : p + (target - p) * 0.1;
      });
      rowCross.current = rowCross.current.map((p, i) => {
        const target = rowTargets[i] === 1 ? 1 : 0;
        return reduceMotion ? target : p + (target - p) * 0.2;
      });
      colCross.current = colCross.current.map((p, j) => {
        const target = colTargets[j] === 1 ? 1 : 0;
        return reduceMotion ? target : p + (target - p) * 0.2;
      });
      rowPulse.current = rowPulse.current.map((p) => (p > 0 ? p - 1 : 0));
      colPulse.current = colPulse.current.map((p) => (p > 0 ? p - 1 : 0));

      // draw progress bars
      rowProgress.current.forEach((p, i) => {
        ctx.fillStyle = rowErrors[i] ? '#b91c1c' : '#15803d';
        ctx.fillRect(0, CLUE_SPACE + i * CELL_SIZE, CLUE_SPACE * p, CELL_SIZE);
      });
      colProgress.current.forEach((p, j) => {
        ctx.fillStyle = colErrors[j] ? '#b91c1c' : '#1e40af';
        ctx.fillRect(
          CLUE_SPACE + j * CELL_SIZE,
          0,
          CELL_SIZE,
          CLUE_SPACE * p
        );
      });

      ctx.fillStyle = '#000';
      ctx.font = '16px monospace';

      // row clues
      ctx.textAlign = 'right';
      rows.forEach((clues, i) => {
        const text = clues.join(' ');
        const xEnd = CLUE_SPACE - 4;
        const y = CLUE_SPACE + i * CELL_SIZE + CELL_SIZE * 0.7;
        const pulse = rowPulse.current[i];
        if (rowErrors[i]) {
          ctx.fillStyle = '#b91c1c';
        } else if (pulse > 0) {
          const intensity = 0.5 + 0.5 * Math.sin((pulse / 30) * Math.PI * 4);
          ctx.fillStyle = `rgba(34,197,94,${intensity})`;
        } else {
          ctx.fillStyle = '#000';
        }
        ctx.fillText(text, xEnd, y);
        const textWidth = ctx.measureText(text).width;
        const progress = rowCross.current[i];
        if (progress > 0) {
          ctx.strokeStyle = '#a00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xEnd - textWidth, y - 8);
          ctx.lineTo(xEnd - textWidth + textWidth * progress, y - 8);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#000';
        }
      });

      // column clues
      ctx.textAlign = 'center';
      cols.forEach((clues, j) => {
        const x = CLUE_SPACE + j * CELL_SIZE + CELL_SIZE / 2;
        const pulse = colPulse.current[j];
        clues
          .slice()
          .reverse()
          .forEach((c, idx) => {
            const y = CLUE_SPACE - 4 - idx * 16;
            if (colErrors[j]) {
              ctx.fillStyle = '#b91c1c';
            } else if (pulse > 0) {
              const intensity = 0.5 + 0.5 * Math.sin((pulse / 30) * Math.PI * 4);
              ctx.fillStyle = `rgba(59,130,246,${intensity})`;
            } else {
              ctx.fillStyle = '#000';
            }
            ctx.fillText(String(c), x, y);
          });
        const progress = colCross.current[j];
        if (progress > 0) {
          const topY = CLUE_SPACE - 4 - (clues.length - 1) * 16 - 8;
          const bottomY = CLUE_SPACE - 4 + 8;
          ctx.strokeStyle = '#a00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, topY);
          ctx.lineTo(x, topY + (bottomY - topY) * progress);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#000';
        }
      });

      // grid lines
      ctx.strokeStyle = '#000';
      for (let i = 0; i <= height; i++) {
        ctx.beginPath();
        ctx.moveTo(CLUE_SPACE, CLUE_SPACE + i * CELL_SIZE);
        ctx.lineTo(CLUE_SPACE + width * CELL_SIZE, CLUE_SPACE + i * CELL_SIZE);
        ctx.stroke();
      }
      for (let j = 0; j <= width; j++) {
        ctx.beginPath();
        ctx.moveTo(CLUE_SPACE + j * CELL_SIZE, CLUE_SPACE);
        ctx.lineTo(
          CLUE_SPACE + j * CELL_SIZE,
          CLUE_SPACE + height * CELL_SIZE
        );
        ctx.stroke();
      }

      // cells
      gridRef.current.forEach((row, i) => {
        row.forEach((cell, j) => {
          const x = CLUE_SPACE + j * CELL_SIZE;
          const y = CLUE_SPACE + i * CELL_SIZE;
          if (cell === 1) {
            ctx.fillStyle = solution[i][j] === 1 ? '#222' : '#b91c1c';
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 1, CELL_SIZE - 1);
          } else if (cell === -1) {
            ctx.strokeStyle = '#a00';
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 4);
            ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
            ctx.moveTo(x + CELL_SIZE - 4, y + 4);
            ctx.lineTo(x + 4, y + CELL_SIZE - 4);
            ctx.stroke();
            ctx.strokeStyle = '#000';
          }
        });
      });

      if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      } else if (!completed.current) {
        setTime(Math.floor((Date.now() - startTime.current) / 1000));
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [rows, cols, paused, height, width, rowTargets, colTargets, rowErrors, colErrors, reduceMotion, solution]);

  // mouse interaction
  const painting = useRef(false);
  const dragValue = useRef(0);
  const dragStart = useRef({ i: 0, j: 0 });
  const dragAxis = useRef(null);

  const getCell = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - CLUE_SPACE;
    const y = e.clientY - rect.top - CLUE_SPACE;
    return {
      i: Math.floor(y / CELL_SIZE),
      j: Math.floor(x / CELL_SIZE),
    };
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const { i, j } = getCell(e);
      if (i < 0 || i >= height || j < 0 || j >= width) return;
      painting.current = true;
      dragStart.current = { i, j };
      dragAxis.current = null;
      const current = gridRef.current[i][j];
      if (mode === 'paint') dragValue.current = current === 1 ? 0 : 1;
      else dragValue.current = current === -1 ? 0 : -1;
      setCellValue(i, j, dragValue.current);
    },
    [getCell, height, width, mode, setCellValue]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!painting.current) return;
      const { i, j } = getCell(e);
      if (i < 0 || i >= height || j < 0 || j >= width) return;
      if (dragAxis.current === null) {
        if (i !== dragStart.current.i || j !== dragStart.current.j) {
          dragAxis.current =
            Math.abs(i - dragStart.current.i) > Math.abs(j - dragStart.current.j)
              ? 'col'
              : 'row';
        } else {
          return;
        }
      }
      let ni = i;
      let nj = j;
      if (dragAxis.current === 'row') ni = dragStart.current.i;
      else if (dragAxis.current === 'col') nj = dragStart.current.j;
      setCellValue(ni, nj, dragValue.current);
    },
    [getCell, height, width, setCellValue]
  );

  useEffect(() => {
    const up = () => {
      painting.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <div className="sr-only" aria-live="polite">{liveMessage}</div>
      <div className="sr-only">
        {rowTargets.map((p, i) => (
          <div
            key={`r${i}`}
            role="progressbar"
            aria-valuenow={Math.round(p * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Row ${i + 1} progress`}
            aria-valuetext={rowErrors[i] ? 'error' : undefined}
          />
        ))}
        {colTargets.map((p, i) => (
          <div
            key={`c${i}`}
            role="progressbar"
            aria-valuenow={Math.round(p * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Column ${i + 1} progress`}
            aria-valuetext={colErrors[i] ? 'error' : undefined}
          />
        ))}
      </div>
      <div className="mb-2">
        Time: {time}s{highScore !== null && ` | Best: ${highScore}s`}
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
        className="bg-gray-200"
      />
      <div className="mt-2 space-x-2">
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setMode(mode === 'paint' ? 'mark' : 'paint')}
        >
          Mode: {mode === 'paint' ? 'Paint' : 'Mark'}
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className={`px-3 py-1 rounded ${
            sound ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500'
          }`}
          onClick={() => setSound((s) => !s)}
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <button
          className={`px-3 py-1 rounded ${
            preventIllegal ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500'
          }`}
          onClick={() => setPreventIllegal((p) => !p)}
        >
          Strict: {preventIllegal ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
};

export default Nonogram;

