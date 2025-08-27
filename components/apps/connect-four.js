import React, { useRef, useEffect, useState } from 'react';

const ROWS = 6;
const COLS = 7;
const SIZE = 80;

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const ConnectFour = () => {
  const canvasRef = useRef(null);
  const dropRef = useRef(null);
  const boardRef = useRef(createBoard());
  const pausedRef = useRef(false);
  const soundRef = useRef(true);
  const hoverRef = useRef({ col: null, row: null });
  const reduceRef = useRef(false);

  const [, setBoardState] = useState(boardRef.current);
  const [current, setCurrent] = useState(1); // 1 red, 2 yellow
  const [winner, setWinner] = useState(null);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [announcement, setAnnouncement] = useState("Red's turn");
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connect-four-highscore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [scores, setScores] = useState({ red: 0, yellow: 0 });
  const highRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    highRef.current = highScore;
    localStorage.setItem('connect-four-highscore', String(highScore));
  }, [highScore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => {
        reduceRef.current = mq.matches;
      };
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  useEffect(() => {
    if (winner) {
      setAnnouncement(winner === 'draw' ? 'Game ended in draw' : `${winner} wins`);
    } else {
      setAnnouncement(`${current === 1 ? 'Red' : 'Yellow'}'s turn`);
    }
  }, [current, winner]);

  const reset = () => {
    boardRef.current = createBoard();
    setBoardState(boardRef.current);
    setWinner(null);
    setCurrent(1);
    dropRef.current = null;
    setScores({ red: 0, yellow: 0 });
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);

  const beep = () => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = 400;
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1);
      osc.stop(ac.currentTime + 0.1);
    } catch (e) {
      // ignore
    }
  };

  const handleClick = (e) => {
    if (winner || dropRef.current || pausedRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / SIZE);
    if (col < 0 || col >= COLS) return;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (boardRef.current[r][col] === 0) {
        dropRef.current = { col, row: r, y: reduceRef.current ? r * SIZE : -SIZE, color: current };
        break;
      }
    }
  };

  const handleMove = (e) => {
    if (winner || dropRef.current || pausedRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / SIZE);
    if (col < 0 || col >= COLS) {
      hoverRef.current = { col: null, row: null };
      return;
    }
    let row = null;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (boardRef.current[r][col] === 0) {
        row = r;
        break;
      }
    }
    hoverRef.current = { col, row };
  };

  const handleLeave = () => {
    hoverRef.current = { col: null, row: null };
  };

  const checkWin = (board, row, col, color) => {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of dirs) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const r = row + dy * i;
        const c = col + dx * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
        count++;
      }
      for (let i = 1; i < 4; i++) {
        const r = row - dy * i;
        const c = col - dx * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) break;
        count++;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * SIZE;
    canvas.height = ROWS * SIZE;

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * SIZE + SIZE / 2;
          const y = r * SIZE + SIZE / 2;
          ctx.beginPath();
          ctx.arc(x, y, SIZE / 2 - 5, 0, Math.PI * 2);
          const cell = boardRef.current[r][c];
          ctx.fillStyle = cell === 1 ? '#ef4444' : cell === 2 ? '#facc15' : '#1e3a8a';
          ctx.fill();
        }
      }

      const hover = hoverRef.current;
      if (hover.col !== null) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(hover.col * SIZE, 0, SIZE, canvas.height);
        if (hover.row !== null && !dropRef.current && !pausedRef.current) {
          ctx.beginPath();
          ctx.arc(
            hover.col * SIZE + SIZE / 2,
            hover.row * SIZE + SIZE / 2,
            SIZE / 2 - 5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle =
            current === 1 ? 'rgba(239,68,68,0.5)' : 'rgba(250,204,21,0.5)';
          ctx.fill();
        }
      }

      if (dropRef.current && !pausedRef.current) {
        const p = dropRef.current;
        const target = p.row * SIZE;
        if (!reduceRef.current) p.y += 8;
        if (p.y >= target) {
          boardRef.current[p.row][p.col] = p.color;
          setBoardState(boardRef.current.map((row) => row.slice()));
          dropRef.current = null;
          if (soundRef.current) beep();
          if (checkWin(boardRef.current, p.row, p.col, p.color)) {
            const winCol = p.color === 1 ? 'red' : 'yellow';
            setWinner(winCol);
            setScores((s) => {
              const next = { ...s, [winCol]: s[winCol] + 1 };
              const best = Math.max(next.red, next.yellow);
              if (best > highRef.current) setHighScore(best);
              return next;
            });
          } else if (boardRef.current[0].every((v) => v !== 0)) {
            setWinner('draw');
          } else {
            setCurrent((c) => (c === 1 ? 2 : 1));
          }
        } else {
          ctx.beginPath();
          ctx.arc(
            p.col * SIZE + SIZE / 2,
            (reduceRef.current ? target : p.y) + SIZE / 2,
            SIZE / 2 - 5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = p.color === 1 ? '#ef4444' : '#facc15';
          ctx.fill();
          if (reduceRef.current) {
            p.y = target;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2 flex gap-4 items-center">
        <div>Red: {scores.red}</div>
        <div>Yellow: {scores.yellow}</div>
        <div>High: {highScore}</div>
        {winner && (
          <div className="capitalize">{winner === 'draw' ? 'Draw' : `${winner} wins`}</div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * SIZE}
        height={ROWS * SIZE}
        className="bg-blue-700 cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={reset}>
          Reset
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={togglePause}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleSound}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
      </div>
    </div>
  );
};

export default ConnectFour;

