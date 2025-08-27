import React, { useState, useRef, useEffect } from 'react';
import {
  SIZE,
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
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
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
      for (let r = 0; r < SIZE; r += 1) {
        for (let c = 0; c < SIZE; c += 1) {
          const cell = b[r][c];
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
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
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
    if (player === 'W' && !paused) {
      const t = setTimeout(() => {
        const entries = Object.entries(moves);
        let best = entries[0][0];
        let max = entries[0][1].length;
        entries.forEach(([k, f]) => {
          if (f.length > max) { best = k; max = f.length; }
        });
        const [r, c] = best.split('-').map(Number);
        setBoard((b) => applyMove(b, r, c, 'W', moves[best]));
        playSound();
        setPlayer('B');
      }, 300);
      return () => clearTimeout(t);
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
    setBoard((b) => applyMove(b, r, c, 'B', flips));
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
      <div className="mt-1">{message}</div>
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
