import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout.js';
import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  hasMoves,
  evaluateBoard,
} from './checkers/engine';

const TILE = 50;
const BOARD_PIXELS = TILE * 8;

// simple minimax returning best move for given color
const minimax = (board, color, depth) => {
  if (depth === 0 || !hasMoves(board, color)) {
    return { score: evaluateBoard(board) };
  }
  const moves = getAllMoves(board, color);
  if (color === 'red') {
    let max = -Infinity;
    let best = null;
    for (const m of moves) {
      const { board: nb } = applyMove(board, m);
      const { score } = minimax(nb, 'black', depth - 1);
      if (score > max) {
        max = score;
        best = m;
      }
    }
    return { score: max, move: best };
  }
  let min = Infinity;
  let best = null;
  for (const m of moves) {
    const { board: nb } = applyMove(board, m);
    const { score } = minimax(nb, 'red', depth - 1);
    if (score < min) {
      min = score;
      best = m;
    }
  }
  return { score: min, move: best };
};

const Checkers = () => {
  const canvasRef = useRef(null);

  const [board, setBoard] = useState(() => createBoard());
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [turn, setTurn] = useState('red');
  const turnRef = useRef(turn);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const [moves, setMoves] = useState([]);
  const movesRef = useRef(moves);
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [difficulty, setDifficulty] = useState('hard');
  const [wins, setWins] = useState({ player: 0, ai: 0 });
  const [winner, setWinner] = useState(null);

  // load wins
  useEffect(() => {
    const stored = localStorage.getItem('checkersWins');
    if (stored) {
      try {
        setWins(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('checkersWins', JSON.stringify(wins));
  }, [wins]);

  const playBeep = useCallback(() => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 500;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // ignore
    }
  }, [sound]);

  const draw = useCallback(
    (ctx) => {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#eee' : '#555';
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
      const sel = selectedRef.current;
      if (sel) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(sel[1] * TILE + 2, sel[0] * TILE + 2, TILE - 4, TILE - 4);
        for (const m of movesRef.current) {
          ctx.strokeStyle = 'lime';
          ctx.strokeRect(m.to[1] * TILE + 6, m.to[0] * TILE + 6, TILE - 12, TILE - 12);
        }
      }
      boardRef.current.forEach((row, r) => {
        row.forEach((piece, c) => {
          if (piece) {
            ctx.beginPath();
            ctx.fillStyle = piece.color === 'red' ? '#e74c3c' : '#111';
            ctx.arc(
              c * TILE + TILE / 2,
              r * TILE + TILE / 2,
              TILE / 2 - 5,
              0,
              Math.PI * 2
            );
            ctx.fill();
            if (piece.king) {
              ctx.fillStyle = 'gold';
              ctx.font = '20px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('K', c * TILE + TILE / 2, r * TILE + TILE / 2);
            }
          }
        });
      });
      if (winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);
        ctx.fillStyle = 'white';
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${winner} wins`, BOARD_PIXELS / 2, BOARD_PIXELS / 2);
      } else if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);
        ctx.fillStyle = 'white';
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', BOARD_PIXELS / 2, BOARD_PIXELS / 2);
      }
    },
    [paused, winner]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let anim;
    const render = () => {
      draw(ctx);
      anim = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(anim);
  }, [draw]);

  const makeMove = useCallback(
    (move) => {
      const { board: nb, capture } = applyMove(boardRef.current, move);
      setBoard(nb);
      boardRef.current = nb;
      playBeep();
      const next = turnRef.current === 'red' ? 'black' : 'red';
      if (capture) {
        const further = getPieceMoves(nb, move.to[0], move.to[1]).filter((m) => m.captured);
        if (further.length) {
          setSelected([move.to[0], move.to[1]]);
          setMoves(further);
          return;
        }
      }
      setTurn(next);
      setSelected(null);
      setMoves([]);
      if (!hasMoves(nb, next)) {
        setWinner(turnRef.current);
        if (turnRef.current === 'red')
          setWins((w) => ({ ...w, player: w.player + 1 }));
        else setWins((w) => ({ ...w, ai: w.ai + 1 }));
      }
    },
    [playBeep]
  );

  const aiMove = useCallback(() => {
    let move;
    if (difficulty === 'easy') {
      const moves = getAllMoves(boardRef.current, 'black');
      move = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === 'medium') {
      ({ move } = minimax(boardRef.current, 'black', 2));
    } else {
      ({ move } = minimax(boardRef.current, 'black', 3));
    }
    if (move) makeMove(move);
    else {
      setWinner('red');
      setWins((w) => ({ ...w, player: w.player + 1 }));
    }
  }, [makeMove, difficulty]);

  useEffect(() => {
    if (turn === 'black' && !winner && !paused) {
      const id = setTimeout(aiMove, 400);
      return () => clearTimeout(id);
    }
  }, [turn, winner, paused, aiMove]);

  const handleClick = (e) => {
    if (paused || winner || turn !== 'red') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / TILE);
    const c = Math.floor(x / TILE);
    const sel = selectedRef.current;
    const piece = boardRef.current[r][c];
    if (sel) {
      const move = movesRef.current.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) {
        makeMove(move);
        return;
      }
    }
    if (piece && piece.color === 'red') {
      const all = getAllMoves(boardRef.current, 'red');
      const pieceMoves = getPieceMoves(boardRef.current, r, c);
      const mustCapture = all.some((m) => m.captured);
      const filtered = mustCapture
        ? pieceMoves.filter((m) => m.captured)
        : pieceMoves;
      setSelected([r, c]);
      setMoves(filtered);
    } else {
      setSelected(null);
      setMoves([]);
    }
  };

  const reset = () => {
    const b = createBoard();
    setBoard(b);
    boardRef.current = b;
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="w-56 mb-4">
        <input
          type="range"
          min="0"
          max="2"
          value={[ 'easy', 'medium', 'hard' ].indexOf(difficulty)}
          onChange={(e) =>
            setDifficulty(['easy', 'medium', 'hard'][parseInt(e.target.value, 10)])
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs">
          <span>Easy</span>
          <span>Medium</span>
          <span>Hard</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={BOARD_PIXELS}
        height={BOARD_PIXELS}
        onClick={handleClick}
        className="mb-2"
      />
      <div className="space-x-2 mb-2">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setSound((s) => !s)}
        >
          {sound ? 'Sound On' : 'Sound Off'}
        </button>
      </div>
      <div className="text-sm">Wins: You {wins.player} - AI {wins.ai}</div>
    </div>
  );
};

export default function CheckersApp() {
  return (
    <GameLayout gameId="checkers">
      <Checkers />
    </GameLayout>
  );
}

