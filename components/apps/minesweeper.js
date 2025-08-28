import React, { useEffect, useRef, useState } from 'react';

const BOARD_SIZE = 8;
const MINES_COUNT = 10;
const CELL_SIZE = 32;
const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE;

const numberColors = [
  '#0000ff',
  '#008000',
  '#ff0000',
  '#800080',
  '#800000',
  '#008080',
  '#000000',
  '#808080',
];

// simple seeded pseudo random generator
const mulberry32 = (a) => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const cloneBoard = (board) =>
  board.map((row) => row.map((cell) => ({ ...cell })));

const generateBoard = (seed, sx, sy) => {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );

  const rng = mulberry32(seed);
  const indices = Array.from(
    { length: BOARD_SIZE * BOARD_SIZE },
    (_, i) => i,
  );

  // Fisher-Yates shuffle using seeded rng
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = new Set();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
        safe.add(nx * BOARD_SIZE + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= MINES_COUNT) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / BOARD_SIZE);
    const y = idx % BOARD_SIZE;
    board[x][y].mine = true;
    placed++;
  }

  const dirs = [-1, 0, 1];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      dirs.forEach((dx) =>
        dirs.forEach((dy) => {
          if (dx === 0 && dy === 0) return;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < BOARD_SIZE &&
            ny >= 0 &&
            ny < BOARD_SIZE &&
            board[nx][ny].mine
          ) {
            count++;
          }
        }),
      );
      board[x][y].adjacent = count;
    }
  }
  return board;
};

const calculateBV = (board) => {
  const visited = board.map((row) => row.map(() => false));
  let bv = 0;
  const dirs = [-1, 0, 1];
  const inBounds = (x, y) =>
    x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y].mine || visited[x][y] || board[x][y].adjacent !== 0)
        continue;
      bv++;
      const queue = [[x, y]];
      visited[x][y] = true;
      while (queue.length) {
        const [cx, cy] = queue.shift();
        dirs.forEach((dx) =>
          dirs.forEach((dy) => {
            if (dx === 0 && dy === 0) return;
            const nx = cx + dx;
            const ny = cy + dy;
            if (
              inBounds(nx, ny) &&
              !visited[nx][ny] &&
              !board[nx][ny].mine
            ) {
              visited[nx][ny] = true;
              if (board[nx][ny].adjacent === 0) {
                queue.push([nx, ny]);
              }
            }
          }),
        );
      }
    }
  }

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (!board[x][y].mine && !visited[x][y]) bv++;
    }
  }
  return bv;
};

const checkWin = (board) =>
  board.flat().every((cell) => cell.revealed || cell.mine);

const calculateRiskMap = (board) => {
  const risk = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0),
  );
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;
      let maxProb = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
          const nCell = board[nx][ny];
          if (!nCell.revealed || nCell.mine || nCell.adjacent === 0) continue;
          let flagged = 0;
          let hidden = 0;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              if (ox === 0 && oy === 0) continue;
              const mx = nx + ox;
              const my = ny + oy;
              if (
                mx < 0 ||
                mx >= BOARD_SIZE ||
                my < 0 ||
                my >= BOARD_SIZE
              )
                continue;
              const around = board[mx][my];
              if (around.flagged) flagged++;
              if (!around.revealed && !around.flagged) hidden++;
            }
          }
          const remaining = nCell.adjacent - flagged;
          if (remaining > 0 && hidden > 0) {
            const prob = remaining / hidden;
            if (prob > maxProb) maxProb = prob;
          }
        }
      }
      risk[x][y] = maxProb;
    }
  }
  return risk;
};

const Minesweeper = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const initWorker = () => {
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./minesweeper.worker.js', import.meta.url),
      );
    } else {
      workerRef.current = null;
    }
  };
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('ready');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [shareCode, setShareCode] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [bv, setBV] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [flags, setFlags] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState(0);
  const [sound, setSound] = useState(true);
  const [ariaMessage, setAriaMessage] = useState('');
  const prefersReducedMotion = useRef(false);
  const [showRisk, setShowRisk] = useState(false);
  const leftDown = useRef(false);
  const rightDown = useRef(false);

  useEffect(() => {
    initWorker();
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const best = localStorage.getItem('minesweeper-best-time');
      if (best) setBestTime(parseFloat(best));
    }
  }, []);

  useEffect(() => {
    if (status === 'playing' && !paused) {
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, startTime, paused]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.current = media.matches;
      const handler = (e) => (prefersReducedMotion.current = e.matches);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const riskMap = showRisk && board ? calculateRiskMap(board) : null;
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const cell = board
            ? board[x][y]
            : { revealed: false, flagged: false, adjacent: 0, mine: false };
          const px = y * CELL_SIZE;
          const py = x * CELL_SIZE;
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 1;
          ctx.fillStyle = cell.revealed ? '#d1d5db' : '#1f2937';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
          if (cell.revealed) {
            if (cell.mine) {
              ctx.fillStyle = '#000';
              ctx.fillText('💣', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
            } else if (cell.adjacent > 0) {
              ctx.fillStyle = numberColors[cell.adjacent - 1] || '#000';
              ctx.fillText(
                cell.adjacent,
                px + CELL_SIZE / 2,
                py + CELL_SIZE / 2,
              );
            }
          } else if (cell.flagged) {
            ctx.fillStyle = '#f00';
            ctx.fillText('🚩', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
          } else if (showRisk && riskMap) {
            const r = riskMap[x][y];
            if (r > 0) {
              ctx.fillStyle = `rgba(255,0,0,${r * 0.4})`;
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            }
          }
        }
      }
      if (paused && status === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = '#fff';
        ctx.fillText('Paused', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [board, status, paused, flags, showRisk]);

  const playSound = (type) => {
    if (!sound || typeof window === 'undefined') return;
    if (!audioRef.current)
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value =
      type === 'boom' ? 120 : type === 'flag' ? 330 : 440;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const checkAndHandleWin = (newBoard) => {
    if (checkWin(newBoard)) {
      setStatus('won');
      const time = (Date.now() - startTime) / 1000;
      setElapsed(time);
      if (typeof window !== 'undefined') {
        if (!bestTime || time < bestTime) {
          setBestTime(time);
          localStorage.setItem('minesweeper-best-time', time.toString());
        }
      }
    }
  };

  const computeRevealed = (board, starts) => {
    if (workerRef.current) {
      return new Promise((resolve) => {
        workerRef.current.onmessage = (e) => resolve(e.data);
        workerRef.current.postMessage({ board, cells: starts });
      });
    }
    const size = board.length;
    const visited = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );
    const queue = [];
    starts.forEach(([sx, sy]) => {
      if (sx >= 0 && sx < size && sy >= 0 && sy < size && !visited[sx][sy]) {
        visited[sx][sy] = true;
        queue.push([sx, sy]);
      }
    });
    const cells = [];
    let hit = false;
    while (queue.length) {
      const [x, y] = queue.shift();
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;
      cells.push([x, y]);
      if (cell.mine) {
        hit = true;
        continue;
      }
      if (cell.adjacent === 0) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < size &&
              ny >= 0 &&
              ny < size &&
              !visited[nx][ny]
            ) {
              visited[nx][ny] = true;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    return Promise.resolve({ cells, hit });
  };

  const revealWave = async (newBoard, sx, sy, onComplete) => {
    const { cells } = await computeRevealed(newBoard, [[sx, sy]]);
    const animate = (order) => {
      let idx = 0;
      const step = () => {
        let processed = 0;
        const limit = 8;
        while (idx < order.length && processed < limit) {
          const [x, y] = order[idx++];
          const cell = newBoard[x][y];
          if (cell.revealed || cell.flagged) continue;
          cell.revealed = true;
          processed++;
        }
        setBoard(cloneBoard(newBoard));
        if (idx < order.length) {
          requestAnimationFrame(step);
        } else {
          onComplete?.(order.length);
        }
      };
      requestAnimationFrame(step);
    };

    animate(cells);
  };

  const startGame = async (x, y) => {
    const newBoard = generateBoard(seed, x, y);
    setBoard(newBoard);
    setStatus('playing');
    setStartTime(Date.now());
    setShareCode(`${seed.toString(36)}-${x}-${y}`);
    setBV(calculateBV(newBoard));
    setFlags(0);
    setPaused(false);
    const finalize = (count) => {
      setAriaMessage(`Revealed ${count} cells`);
      checkAndHandleWin(newBoard);
    };
    if (prefersReducedMotion.current) {
      const { cells } = await computeRevealed(newBoard, [[x, y]]);
      cells.forEach(([cx, cy]) => {
        newBoard[cx][cy].revealed = true;
      });
      setBoard(cloneBoard(newBoard));
      finalize(cells.length);
    } else {
      revealWave(newBoard, x, y, finalize);
    }
  };

  const handleClick = async (x, y) => {
    if (status === 'lost' || status === 'won' || paused) return;
    if (!board) {
      await startGame(x, y);
      playSound('reveal');
      return;
    }

    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];

    if (cell.revealed) {
      if (cell.adjacent > 0) {
        let flagged = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 &&
              nx < BOARD_SIZE &&
              ny >= 0 &&
              ny < BOARD_SIZE &&
              newBoard[nx][ny].flagged
            ) {
              flagged++;
            }
          }
        }
        if (flagged === cell.adjacent) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (
                nx >= 0 &&
                nx < BOARD_SIZE &&
                ny >= 0 &&
                ny < BOARD_SIZE &&
                !newBoard[nx][ny].flagged
              ) {
                const { hit, cells: revealed } = await computeRevealed(
                  newBoard,
                  [[nx, ny]],
                );
                revealed.forEach(([cx, cy]) => {
                  newBoard[cx][cy].revealed = true;
                });
                if (hit) {
                  setBoard(newBoard);
                  setStatus('lost');
                  playSound('boom');
                  setAriaMessage('Boom! Game over');
                  return;
                }
              }
            }
          }
        }
      }
    } else {
      if (cell.mine) {
        const { cells: revealed } = await computeRevealed(newBoard, [[x, y]]);
        revealed.forEach(([cx, cy]) => {
          newBoard[cx][cy].revealed = true;
        });
        setBoard(newBoard);
        setStatus('lost');
        playSound('boom');
        setAriaMessage('Boom! Game over');
        return;
      }
      playSound('reveal');
      if (cell.adjacent === 0 && !prefersReducedMotion.current) {
        revealWave(newBoard, x, y, (count) => {
          setAriaMessage(`Revealed ${count} cells`);
          checkAndHandleWin(newBoard);
        });
        return;
      } else {
        const { cells: revealed } = await computeRevealed(newBoard, [[x, y]]);
        revealed.forEach(([cx, cy]) => {
          newBoard[cx][cy].revealed = true;
        });
        setAriaMessage(`Revealed cell at row ${x + 1}, column ${y + 1}`);
      }
    }

    setBoard(newBoard);
    checkAndHandleWin(newBoard);
  };

  const toggleFlag = (x, y) => {
    if (status !== 'playing' || paused || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setFlags((f) => f + (cell.flagged ? 1 : -1));
    setBoard(newBoard);
    setAriaMessage(
      cell.flagged
        ? `Flagged cell at row ${x + 1}, column ${y + 1}`
        : `Unflagged cell at row ${x + 1}, column ${y + 1}`,
    );
    playSound('flag');
  };

  const handleChord = async (x, y) => {
    if (status !== 'playing' || paused || !board) return;
    const newBoard = cloneBoard(board);
    const cell = newBoard[x][y];
    if (!cell.revealed || cell.adjacent === 0) return;
    let flagged = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          newBoard[nx][ny].flagged
        ) {
          flagged++;
        }
      }
    }
    if (flagged !== cell.adjacent) return;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          !newBoard[nx][ny].flagged
        ) {
          const { hit, cells: revealed } = await computeRevealed(
            newBoard,
            [[nx, ny]],
          );
          revealed.forEach(([cx, cy]) => {
            newBoard[cx][cy].revealed = true;
          });
          if (hit) {
            setBoard(newBoard);
            setStatus('lost');
            playSound('boom');
            setAriaMessage('Boom! Game over');
            return;
          }
        }
      }
    }
    setBoard(newBoard);
    checkAndHandleWin(newBoard);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const x = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (e.button === 0) {
      leftDown.current = true;
    } else if (e.button === 2) {
      rightDown.current = true;
      e.preventDefault();
    } else if (e.button === 1) {
      handleChord(x, y);
    }
  };

  const handleMouseUp = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const x = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (e.button === 0) {
      if (rightDown.current) {
        handleChord(x, y);
        rightDown.current = false;
      } else {
        handleClick(x, y);
      }
      leftDown.current = false;
    } else if (e.button === 2) {
      if (leftDown.current) {
        handleChord(x, y);
        leftDown.current = false;
      } else {
        toggleFlag(x, y);
      }
      rightDown.current = false;
    }
  };

  const handleMouseLeave = () => {
    leftDown.current = false;
    rightDown.current = false;
  };

  const reset = () => {
    workerRef.current?.terminate();
    initWorker();
    setBoard(null);
    setStatus('ready');
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setShareCode('');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    setCodeInput('');
    setFlags(0);
    setPaused(false);
    setAriaMessage('');
  };

  const copyCode = () => {
    if (typeof navigator !== 'undefined' && shareCode) {
      navigator.clipboard.writeText(shareCode);
    }
  };

  const loadFromCode = async () => {
    if (!codeInput) return;
    const parts = codeInput.trim().split('-');
    const newSeed = parseInt(parts[0], 36);
    if (Number.isNaN(newSeed)) return;
    workerRef.current?.terminate();
    initWorker();
    setSeed(newSeed);
    setShareCode('');
    setBoard(null);
    setStatus('ready');
    setStartTime(null);
    setElapsed(0);
    setBV(0);
    setFlags(0);
    setPaused(false);
    if (parts.length === 3) {
      const x = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const newBoard = generateBoard(newSeed, x, y);
        setBoard(newBoard);
        setStatus('playing');
        setStartTime(Date.now());
        setShareCode(codeInput.trim());
        setBV(calculateBV(newBoard));
        setFlags(0);
        const finalize = (count) => {
          setAriaMessage(`Revealed ${count} cells`);
          checkAndHandleWin(newBoard);
        };
        if (prefersReducedMotion.current) {
          const { cells } = await computeRevealed(newBoard, [[x, y]]);
          cells.forEach(([cx, cy]) => {
            newBoard[cx][cy].revealed = true;
          });
          setBoard(cloneBoard(newBoard));
          finalize(cells.length);
        } else {
          revealWave(newBoard, x, y, finalize);
        }
      }
    }
    setCodeInput('');
  };

  const togglePause = () => {
    if (status !== 'playing') return;
    if (!paused) {
      setPaused(true);
      setPauseStart(Date.now());
    } else {
      setPaused(false);
      setStartTime((s) => s + (Date.now() - pauseStart));
    }
  };

  const toggleSound = () => setSound((s) => !s);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2 flex items-center space-x-2">
        <span>Seed:</span>
        <span className="font-mono">{seed.toString(36)}</span>
        {shareCode && (
          <button
            onClick={copyCode}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy Code
          </button>
        )}
      </div>
      <div className="mb-2 flex items-center space-x-2">
        <input
          className="px-1 text-black"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="seed or share code"
        />
        <button
          onClick={loadFromCode}
          className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Load
        </button>
      </div>
      <div className="mb-2">Mines: {MINES_COUNT - flags}</div>
      <div className="mb-2">3BV: {bv} | Best: {bestTime ? bestTime.toFixed(2) : '--'}s{status === 'won' ? ` | Time: ${elapsed.toFixed(2)}s` : ''}</div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
        className="bg-gray-700 mb-4"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-2 mb-2">
        {status === 'ready'
          ? 'Click any cell to start'
          : status === 'playing'
          ? paused
            ? 'Paused'
            : 'Game in progress'
          : status === 'won'
          ? 'You win!'
          : 'Boom! Game over'}
      </div>
      <div className="flex space-x-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleSound}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setShowRisk((r) => !r)}
        >
          {showRisk ? 'Risk: On' : 'Risk: Off'}
        </button>
      </div>
      <div aria-live="polite" className="sr-only">{ariaMessage}</div>
    </div>
  );
};

export default Minesweeper;

