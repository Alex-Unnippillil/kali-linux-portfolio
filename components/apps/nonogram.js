import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { validateSolution, puzzles } from './nonogramUtils';

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
  const rowProgress = useRef(Array(height).fill(0));
  const colProgress = useRef(Array(width).fill(0));
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
  const [time, setTime] = useState(0);
  const [highScore, setHighScore] = useState(null);
  const startTime = useRef(Date.now());
  const completed = useRef(false);

  // load stored high score
  useEffect(() => {
    const hs = localStorage.getItem('nonogramHighScore');
    if (hs) setHighScore(parseInt(hs, 10));
    reset();
  }, []);

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

  const toggleCell = useCallback(
    (i, j) => {
      if (paused || completed.current) return;
      setGrid((g) => {
        const ng = g.map((row) => row.slice());
        if (mode === 'paint') ng[i][j] = ng[i][j] === 1 ? 0 : 1;
        else if (mode === 'mark') ng[i][j] = ng[i][j] === -1 ? 0 : -1;
        checkSolved(ng);
        return ng;
      });
      playSound();
    },
    [mode, paused, checkSolved, playSound]
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
    const newRowTargets = rows.map((_, i) => {
      let correct = 0;
      let total = 0;
      for (let j = 0; j < width; j++) {
        if (solution[i][j] === 1) {
          total += 1;
          if (grid[i][j] === 1) correct += 1;
        } else if (grid[i][j] === 1) correct -= 1;
      }
      return total ? Math.max(0, Math.min(1, correct / total)) : 1;
    });
    const newColTargets = cols.map((_, j) => {
      let correct = 0;
      let total = 0;
      for (let i = 0; i < height; i++) {
        if (solution[i][j] === 1) {
          total += 1;
          if (grid[i][j] === 1) correct += 1;
        } else if (grid[i][j] === 1) correct -= 1;
      }
      return total ? Math.max(0, Math.min(1, correct / total)) : 1;
    });
    setRowTargets(newRowTargets);
    setColTargets(newColTargets);
    let message = '';
    newRowTargets.forEach((p, i) => {
      if (p === 1 && prevRow.current[i] < 1) message = `Row ${i + 1} solved`;
      prevRow.current[i] = p;
    });
    newColTargets.forEach((p, j) => {
      if (p === 1 && prevCol.current[j] < 1) message = `Column ${j + 1} solved`;
      prevCol.current[j] = p;
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

      // draw progress bars
      ctx.fillStyle = '#15803d'; // row progress color (green-700)
      rowProgress.current.forEach((p, i) => {
        ctx.fillRect(0, CLUE_SPACE + i * CELL_SIZE, CLUE_SPACE * p, CELL_SIZE);
      });
      ctx.fillStyle = '#1e40af'; // column progress color (blue-800)
      colProgress.current.forEach((p, j) => {
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
        ctx.fillText(
          clues.join(' '),
          CLUE_SPACE - 4,
          CLUE_SPACE + i * CELL_SIZE + CELL_SIZE * 0.7
        );
      });

      // column clues
      ctx.textAlign = 'center';
      cols.forEach((clues, j) => {
        clues
          .slice()
          .reverse()
          .forEach((c, idx) => {
            ctx.fillText(
              String(c),
              CLUE_SPACE + j * CELL_SIZE + CELL_SIZE / 2,
              CLUE_SPACE - 4 - idx * 16
            );
          });
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
            ctx.fillStyle = '#222';
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
  }, [rows, cols, paused, height, width, rowTargets, colTargets, reduceMotion]);

  // mouse interaction
  const painting = useRef(false);
  const handlePos = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - CLUE_SPACE;
      const y = e.clientY - rect.top - CLUE_SPACE;
      const i = Math.floor(y / CELL_SIZE);
      const j = Math.floor(x / CELL_SIZE);
      if (i >= 0 && i < height && j >= 0 && j < width) toggleCell(i, j);
    },
    [height, width, toggleCell]
  );

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      painting.current = true;
      handlePos(e);
    },
    [handlePos]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (painting.current) handlePos(e);
    },
    [handlePos]
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
      </div>
    </div>
  );
};

export default Nonogram;

