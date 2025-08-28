import React, { useState, useRef, useEffect } from 'react';
import {
  SIZE,
  DIRECTIONS,
  createBoard,
  computeLegalMoves,
  applyMove,
  countPieces,
} from './reversiLogic';

const BOARD_SIZE = 400;
const CELL = BOARD_SIZE / SIZE;

const Reversi = () => {
  const canvasRef = useRef(null);
  const boardRef = useRef(createBoard());
  const legalRef = useRef({});
  const playerRef = useRef('B');
  const pausedRef = useRef(false);
  const animRef = useRef(0);
  const audioRef = useRef(null);
  const workerRef = useRef(null);
  const aiThinkingRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const flippingRef = useRef([]);

  const [board, setBoard] = useState(() => createBoard());
  const [player, setPlayer] = useState('B');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [message, setMessage] = useState('Your turn');
  const [wins, setWins] = useState({ player: 0, ai: 0 });

  // keep refs in sync
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduceMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (typeof window.Worker === 'function') {
        workerRef.current = new Worker(
          new URL('./reversi.worker.js', import.meta.url)
        );
        workerRef.current.onmessage = (e) => {
          aiThinkingRef.current = false;
          const { move } = e.data;
          if (!move) return;
          const [r, c] = move;
          const moves = computeLegalMoves(boardRef.current, 'W');
          const key = `${r}-${c}`;
          const flips = moves[key];
          if (!flips) return;
          const prev = boardRef.current.map((row) => row.slice());
          const next = applyMove(prev, r, c, 'W', flips);
          queueFlips(r, c, 'W', prev);
          setBoard(next);
          playSound();
          setPlayer('B');
        };
      }
    }
    return () => workerRef.current?.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load wins from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('reversiWins');
    if (saved) {
      try { setWins(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // persist wins
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('reversiWins', JSON.stringify(wins));
  }, [wins]);

  const playSound = () => {
    if (!sound) return;
    const ctx =
      audioRef.current || new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 500;
    osc.start();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  };

  const queueFlips = (r, c, player, prevBoard) => {
    if (reduceMotionRef.current) return;
    const start = performance.now();
    DIRECTIONS.forEach(([dr, dc]) => {
      const seq = [];
      let i = r + dr;
      let j = c + dc;
      while (
        i >= 0 && i < SIZE && j >= 0 && j < SIZE &&
        prevBoard[i][j] && prevBoard[i][j] !== player
      ) {
        seq.push([i, j]);
        i += dr;
        j += dc;
      }
      seq.forEach(([sr, sc], idx) => {
        flippingRef.current.push({
          key: `${sr}-${sc}`,
          from: prevBoard[sr][sc],
          to: player,
          start: start + idx * 80,
          duration: 300,
        });
      });
    });
  };

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      ctx.fillStyle = '#0a7e07';
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
      ctx.strokeStyle = '#000';
      for (let i = 0; i <= SIZE; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(BOARD_SIZE, i * CELL);
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, BOARD_SIZE);
        ctx.stroke();
      }
      const b = boardRef.current;
      const now = performance.now();
      for (let r = 0; r < SIZE; r += 1) {
        for (let c = 0; c < SIZE; c += 1) {
          const cell = b[r][c];
          const anim = flippingRef.current.find((a) => a.key === `${r}-${c}`);
          if (anim) {
            const t = (now - anim.start) / anim.duration;
            if (t <= 0) {
              // Animation hasn't started yet; show original piece
              ctx.beginPath();
              ctx.arc(
                c * CELL + CELL / 2,
                r * CELL + CELL / 2,
                CELL / 2 - 4,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = anim.from === 'B' ? '#000' : '#fff';
              ctx.fill();
            } else if (t >= 1) {
              const idx = flippingRef.current.indexOf(anim);
              if (idx !== -1) flippingRef.current.splice(idx, 1);
              ctx.beginPath();
              ctx.arc(
                c * CELL + CELL / 2,
                r * CELL + CELL / 2,
                CELL / 2 - 4,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = anim.to === 'B' ? '#000' : '#fff';
              ctx.fill();
            } else {
              const scale = Math.abs(1 - 2 * t);
              ctx.save();
              ctx.translate(c * CELL + CELL / 2, r * CELL + CELL / 2);
              ctx.scale(1, scale);
              ctx.beginPath();
              ctx.arc(0, 0, CELL / 2 - 4, 0, Math.PI * 2);
              ctx.fillStyle =
                t < 0.5
                  ? anim.from === 'B' ? '#000' : '#fff'
                  : anim.to === 'B' ? '#000' : '#fff';
              ctx.fill();
              ctx.restore();
            }
            continue;
          }
          if (cell) {
            ctx.beginPath();
            ctx.arc(
              c * CELL + CELL / 2,
              r * CELL + CELL / 2,
              CELL / 2 - 4,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = cell === 'B' ? '#000' : '#fff';
            ctx.fill();
          }
        }
      }
      if (playerRef.current === 'B' && !pausedRef.current) {
        ctx.fillStyle = '#ffff00';
        Object.keys(legalRef.current).forEach((key) => {
          const [r, c] = key.split('-').map(Number);
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // handle turn logic and AI
  useEffect(() => {
    const moves = computeLegalMoves(board, player);
    legalRef.current = moves;
    if (Object.keys(moves).length === 0) {
      const opp = player === 'B' ? 'W' : 'B';
      const oppMoves = computeLegalMoves(board, opp);
      if (Object.keys(oppMoves).length === 0) {
        const { black, white } = countPieces(board);
        if (black > white) {
          setWins((w) => ({ ...w, player: w.player + 1 }));
          setMessage('You win!');
        } else if (white > black) {
          setWins((w) => ({ ...w, ai: w.ai + 1 }));
          setMessage('AI wins!');
        } else {
          setMessage('Draw!');
        }
      } else {
        setPlayer(opp); // pass turn
      }
      return;
    }
    if (player === 'W' && !paused && !aiThinkingRef.current) {
      aiThinkingRef.current = true;
      if (workerRef.current) {
        workerRef.current.postMessage({ board, player: 'W', depth: 3 });
      }
    }
    setMessage(player === 'B' ? 'Your turn' : "AI's turn");
  }, [board, player, paused]);

  const handleClick = (e) => {
    if (paused || player !== 'B') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / CELL);
    const c = Math.floor(x / CELL);
    const key = `${r}-${c}`;
    const flips = legalRef.current[key];
    if (!flips) return;
    const prev = boardRef.current.map((row) => row.slice());
    const next = applyMove(prev, r, c, 'B', flips);
    queueFlips(r, c, 'B', prev);
    setBoard(next);
    playSound();
    setPlayer('W');
  };

  const reset = () => {
    const fresh = createBoard();
    setBoard(fresh);
    setPlayer('B');
    setMessage('Your turn');
    setPaused(false);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <canvas
        ref={canvasRef}
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        onClick={handleClick}
        className="bg-green-700"
      />
      <div className="mt-2">Wins - You: {wins.player} | AI: {wins.ai}</div>
      <div className="mt-1" role="status" aria-live="polite">{message}</div>
      <div className="mt-2 flex space-x-2">
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
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound: On' : 'Sound: Off'}
        </button>
      </div>
    </div>
  );
};

export default Reversi;
