import React, { useRef, useEffect, useState } from 'react';
import { Chess } from 'chess.js';

// 0x88 board representation utilities
const EMPTY = 0;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const WHITE = 1;
const BLACK = -1;

const pieceValues = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

const pieceUnicode = {
  [PAWN]: { [WHITE]: '♙', [BLACK]: '♟' },
  [KNIGHT]: { [WHITE]: '♘', [BLACK]: '♞' },
  [BISHOP]: { [WHITE]: '♗', [BLACK]: '♝' },
  [ROOK]: { [WHITE]: '♖', [BLACK]: '♜' },
  [QUEEN]: { [WHITE]: '♕', [BLACK]: '♛' },
  [KING]: { [WHITE]: '♔', [BLACK]: '♚' },
};

const SIZE = 320; // canvas size
const SQ = SIZE / 8;

const files = 'abcdefgh';
const sqToAlg = (sq) => {
  const file = sq & 15;
  const rank = (sq >> 4) + 1;
  return files[file] + rank;
};
const algToSq = (alg) => {
  const file = files.indexOf(alg[0]);
  const rank = parseInt(alg[1], 10) - 1;
  return rank * 16 + file;
};

// create initial board in 0x88
const createInitialBoard = () => {
  const b = new Int8Array(128);
  const place = (sq, piece) => {
    b[sq] = piece;
  };

  const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
  for (let i = 0; i < 8; i++) {
    place(i, backRank[i]);
    place(16 + i, PAWN);
    place(96 + i, -PAWN);
    place(112 + i, -backRank[i]);
  }
  return b;
};

// move generation helpers
const knightOffsets = [-33, -31, -18, -14, 14, 18, 31, 33];
const bishopOffsets = [-17, -15, 15, 17];
const rookOffsets = [-16, -1, 1, 16];
const kingOffsets = [-17, -16, -15, -1, 1, 15, 16, 17];

const inside = (sq) => (sq & 0x88) === 0;

const isSquareAttacked = (board, sq, bySide) => {
  const enemy = bySide;

  // pawns
  if (enemy === WHITE) {
    if (inside(sq - 15) && board[sq - 15] === PAWN) return true;
    if (inside(sq - 17) && board[sq - 17] === PAWN) return true;
  } else {
    if (inside(sq + 15) && board[sq + 15] === -PAWN) return true;
    if (inside(sq + 17) && board[sq + 17] === -PAWN) return true;
  }

  // knights
  for (const o of knightOffsets) {
    const t = sq + o;
    if (inside(t)) {
      const p = board[t];
      if (p === enemy * KNIGHT) return true;
    }
  }

  // bishops/queens
  for (const o of bishopOffsets) {
    let t = sq + o;
    while (inside(t)) {
      const p = board[t];
      if (p) {
        if (p === enemy * BISHOP || p === enemy * QUEEN) return true;
        break;
      }
      t += o;
    }
  }

  // rooks/queens
  for (const o of rookOffsets) {
    let t = sq + o;
    while (inside(t)) {
      const p = board[t];
      if (p) {
        if (p === enemy * ROOK || p === enemy * QUEEN) return true;
        break;
      }
      t += o;
    }
  }

  // king
  for (const o of kingOffsets) {
    const t = sq + o;
    if (inside(t) && board[t] === enemy * KING) return true;
  }

  return false;
};

const inCheck = (board, side) => {
  for (let i = 0; i < 128; i++) {
    if (!inside(i)) continue;
    if (board[i] === side * KING) {
      return isSquareAttacked(board, i, -side);
    }
  }
  return false;
};

const generateMoves = (board, side) => {
  const moves = [];

  for (let from = 0; from < 128; from++) {
    if (!inside(from)) continue;
    const piece = board[from];
    if (piece * side <= 0) continue;

    const type = Math.abs(piece);

    if (type === PAWN) {
      const dir = side === WHITE ? 16 : -16;
      const startRank = side === WHITE ? 1 : 6;
      const rank = from >> 4;
      const one = from + dir;
      if (inside(one) && board[one] === EMPTY) {
        moves.push({ from, to: one });
        const two = from + dir * 2;
        if (rank === startRank && board[two] === EMPTY)
          moves.push({ from, to: two });
      }
      for (const cap of [dir + 1, dir - 1]) {
        const to = from + cap;
        if (inside(to) && board[to] * side < 0)
          moves.push({ from, to });
      }
    } else if (type === KNIGHT) {
      for (const o of knightOffsets) {
        const to = from + o;
        if (!inside(to)) continue;
        if (board[to] * side <= 0) moves.push({ from, to });
      }
    } else if (type === BISHOP || type === ROOK || type === QUEEN) {
      const dirs = [];
      if (type === BISHOP || type === QUEEN) dirs.push(...bishopOffsets);
      if (type === ROOK || type === QUEEN) dirs.push(...rookOffsets);
      for (const o of dirs) {
        let to = from + o;
        while (inside(to)) {
          const p = board[to];
          if (p === EMPTY) moves.push({ from, to });
          else {
            if (p * side < 0) moves.push({ from, to });
            break;
          }
          to += o;
        }
      }
    } else if (type === KING) {
      for (const o of kingOffsets) {
        const to = from + o;
        if (!inside(to)) continue;
        if (board[to] * side <= 0) moves.push({ from, to });
      }
    }
  }

  // filter out moves that leave king in check
  const legal = [];
  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    if (!inCheck(b, side)) legal.push(m);
  }
  return legal;
};

const evaluate = (board) => {
  let score = 0;
  for (let i = 0; i < 128; i++) {
    if (!inside(i)) continue;
    const piece = board[i];
    if (piece > 0) score += pieceValues[piece];
    else if (piece < 0) score -= pieceValues[-piece];
  }
  return score;
};

const minimax = (board, depth, alpha, beta, side) => {
  if (depth === 0) return evaluate(board);

  const moves = generateMoves(board, side);
  if (moves.length === 0) return evaluate(board);

  if (side === WHITE) {
    let max = -Infinity;
    for (const m of moves) {
      const b = board.slice();
      b[m.to] = b[m.from];
      b[m.from] = EMPTY;
      const val = minimax(b, depth - 1, alpha, beta, -side);
      max = Math.max(max, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return max;
  }
  let min = Infinity;
  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    const val = minimax(b, depth - 1, alpha, beta, -side);
    min = Math.min(min, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  return min;
};

const getBestMove = (board, side, depth) => {
  const moves = generateMoves(board, side);
  let best = null;
  let bestVal = side === WHITE ? -Infinity : Infinity;

  for (const m of moves) {
    const b = board.slice();
    b[m.to] = b[m.from];
    b[m.from] = EMPTY;
    const val = minimax(b, depth - 1, -Infinity, Infinity, -side);
    if ((side === WHITE && val > bestVal) || (side === BLACK && val < bestVal)) {
      bestVal = val;
      best = m;
    }
  }
  return best;
};

const playBeep = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.frequency.value = 400;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const ChessGame = () => {
  const canvasRef = useRef(null);
  const boardRef = useRef(createInitialBoard());
  const chessRef = useRef(new Chess());
  const sideRef = useRef(WHITE);
  const historyRef = useRef([boardRef.current.slice()]);
  const [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState([]);
  const [status, setStatus] = useState('Your move');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [sanLog, setSanLog] = useState([]);
  const particlesRef = useRef([]);
  const [showHints, setShowHints] = useState(false);
  const [mateSquares, setMateSquares] = useState([]);
  const [elo, setElo] = useState(() =>
    typeof window === 'undefined'
      ? 1200
      : Number(localStorage.getItem('chessElo') || 1200)
  );
  const animRef = useRef(null);
  const trailsRef = useRef([]);
  const [evalScore, setEvalScore] = useState(0);
  const [displayEval, setDisplayEval] = useState(0);
  const reduceMotionRef = useRef(false);
  const evalPercent =
    (1 / (1 + Math.exp(-displayEval / 200))) * 100;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = mq.matches;
    const handler = () => (reduceMotionRef.current = mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const updateEval = () => setEvalScore(evaluate(boardRef.current));

  useEffect(() => {
    updateEval();
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current) {
      setDisplayEval(evalScore);
      return;
    }
    let frame;
    const animate = () => {
      setDisplayEval((prev) => {
        const diff = evalScore - prev;
        if (Math.abs(diff) < 1) return evalScore;
        return prev + diff * 0.1;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [evalScore]);

  useEffect(() => {
    updateMateHints();
  }, [showHints]);

  const addTrail = (from, to) => {
    const fx = (from & 15) * SQ + SQ / 2;
    const fy = (7 - (from >> 4)) * SQ + SQ / 2;
    const tx = (to & 15) * SQ + SQ / 2;
    const ty = (7 - (to >> 4)) * SQ + SQ / 2;
    trailsRef.current.push({ fx, fy, tx, ty, t: performance.now() });
  };

  const addCaptureSparks = (sq) => {
    const x = (sq & 15) * SQ + SQ / 2;
    const y = (7 - (sq >> 4)) * SQ + SQ / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 60 + Math.random() * 40;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: performance.now(),
      });
    }
  };

  const updateMateHints = () => {
    if (!showHints) {
      setMateSquares([]);
      return;
    }
    const game = chessRef.current;
    const moves = game.moves({ verbose: true });
    const mates = [];
    for (const m of moves) {
      const clone = new Chess(game.fen());
      clone.move(m);
      if (clone.isCheckmate()) mates.push(algToSq(m.to));
    }
    setMateSquares(mates);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const render = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const x = f * SQ;
          const y = (7 - r) * SQ;
          const light = (r + f) % 2 === 0;
          ctx.fillStyle = light ? '#eee' : '#555';
          ctx.fillRect(x, y, SQ, SQ);

          const sq = r * 16 + f;
          if (selected === sq) {
            ctx.fillStyle = 'rgba(255,255,0,0.4)';
            ctx.fillRect(x, y, SQ, SQ);
          } else {
            const move = moves.find((m) => m.to === sq);
            if (move) {
              ctx.fillStyle = move.capture
                ? 'rgba(255,0,0,0.3)'
                : 'rgba(0,255,0,0.3)';
              ctx.fillRect(x, y, SQ, SQ);
            }
          }

          if (cursor === sq) {
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, SQ - 4, SQ - 4);
          }

          if (mateSquares.includes(sq)) {
            ctx.beginPath();
            ctx.arc(x + SQ / 2, y + SQ / 2, SQ / 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,255,0.5)';
            ctx.fill();
          }

          const piece = boardRef.current[sq];
          if (piece) {
            ctx.font = `${SQ - 10}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = piece > 0 ? '#000' : '#fff';
            ctx.fillText(
              pieceUnicode[Math.abs(piece)][piece > 0 ? WHITE : BLACK],
              x + SQ / 2,
              y + SQ / 2
            );
          }
        }
      }
      const now = performance.now();
      trailsRef.current = trailsRef.current.filter((t) => now - t.t < 1000);
      for (const t of trailsRef.current) {
        const age = (now - t.t) / 1000;
        const alpha = reduceMotionRef.current ? 0.6 : Math.max(0, 1 - age);
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(t.fx, t.fy);
        ctx.lineTo(t.tx, t.ty);
        ctx.stroke();
        const angle = Math.atan2(t.ty - t.fy, t.tx - t.fx);
        const head = 10;
        ctx.beginPath();
        ctx.moveTo(t.tx, t.ty);
        ctx.lineTo(
          t.tx - head * Math.cos(angle - Math.PI / 6),
          t.ty - head * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          t.tx - head * Math.cos(angle + Math.PI / 6),
          t.ty - head * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(255,0,0,${alpha})`;
        ctx.fill();
      }
      particlesRef.current = particlesRef.current.filter((p) => now - p.t < 500);
      for (const p of particlesRef.current) {
        const age = (now - p.t) / 1000;
        const px = p.x + p.vx * age;
        const py = p.y + p.vy * age;
        const alpha = reduceMotionRef.current ? 0.7 : Math.max(0, 1 - age * 2);
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [selected, moves, mateSquares, cursor]);

  const endGame = (result) => {
    // result: 1 win, 0 draw, -1 loss
    const score = result === 1 ? 1 : result === 0 ? 0.5 : 0;
    const opp = 1200;
    const expected = 1 / (1 + 10 ** ((opp - elo) / 400));
    const k = 32;
    const newElo = Math.round(elo + k * (score - expected));
    setElo(newElo);
    if (typeof window !== 'undefined')
      localStorage.setItem('chessElo', String(newElo));
  };

  const checkGameState = () => {
    const game = chessRef.current;
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        if (game.turn() === 'w') {
          setStatus('Checkmate! You lose');
          endGame(-1);
        } else {
          setStatus('Checkmate! You win');
          endGame(1);
        }
      } else {
        setStatus('Draw');
        endGame(0);
      }
      return true;
    }
    return false;
  };

  const aiMove = () => {
    const move = getBestMove(boardRef.current, sideRef.current, 2);
    if (move) {
      const capture = boardRef.current[move.to] !== EMPTY;
      const res = chessRef.current.move({
        from: sqToAlg(move.from),
        to: sqToAlg(move.to),
        promotion: 'q',
      });
      if (!res) return;
      boardRef.current[move.to] = boardRef.current[move.from];
      boardRef.current[move.from] = EMPTY;
      addTrail(move.from, move.to);
      if (capture) addCaptureSparks(move.to);
      historyRef.current.push(boardRef.current.slice());
      setSanLog((l) => [...l, res.san]);
      sideRef.current = -sideRef.current;
      if (sound) playBeep();
      setSelected(null);
      setMoves([]);
      updateEval();
      updateMateHints();
      checkGameState();
      setStatus('Your move');
    }
  };

  const handleSquare = (sq) => {
    if (paused) return;
    setCursor(sq);
    const side = sideRef.current;

    if (selected !== null) {
      const legal = moves.find((m) => m.to === sq);
      if (legal) {
        const res = chessRef.current.move({
          from: sqToAlg(legal.from),
          to: sqToAlg(legal.to),
          promotion: 'q',
        });
        if (res) {
          const capture = boardRef.current[legal.to] !== EMPTY;
          boardRef.current[legal.to] = boardRef.current[legal.from];
          boardRef.current[legal.from] = EMPTY;
          addTrail(legal.from, legal.to);
          if (capture) addCaptureSparks(legal.to);
          if (sound) playBeep();
          historyRef.current.push(boardRef.current.slice());
          setSanLog((l) => [...l, res.san]);
          sideRef.current = -side;
          setSelected(null);
          setMoves([]);
          updateEval();
          updateMateHints();
          if (!checkGameState()) {
            setStatus('AI thinking...');
            setTimeout(aiMove, 200);
          }
          return;
        }
      }
      setSelected(null);
      setMoves([]);
    } else if (boardRef.current[sq] * side > 0) {
      setSelected(sq);
      const legals = chessRef.current
        .moves({ square: sqToAlg(sq), verbose: true })
        .map((m) => ({
          from: algToSq(m.from),
          to: algToSq(m.to),
          capture: !!m.captured,
        }));
      setMoves(legals);
    }
  };

  const handleClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const file = Math.floor(((e.clientX - rect.left) / SIZE) * 8);
    const rank = 7 - Math.floor(((e.clientY - rect.top) / SIZE) * 8);
    const sq = rank * 16 + file;
    handleSquare(sq);
  };

  const handleKey = (e) => {
    if (paused) return;
    let next = cursor;
    if (e.key === 'ArrowUp') next += 16;
    else if (e.key === 'ArrowDown') next -= 16;
    else if (e.key === 'ArrowLeft') next -= 1;
    else if (e.key === 'ArrowRight') next += 1;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSquare(cursor);
      return;
    }
    if (next !== cursor && inside(next)) {
      e.preventDefault();
      setCursor(next);
    }
  };

  const reset = () => {
    boardRef.current = createInitialBoard();
    chessRef.current.reset();
    sideRef.current = WHITE;
    historyRef.current = [boardRef.current.slice()];
    setSelected(null);
    setCursor(0);
    setMoves([]);
    trailsRef.current = [];
    particlesRef.current = [];
    setSanLog([]);
    updateEval();
    updateMateHints();
    setPaused(false);
    setStatus('Your move');
  };

  const togglePause = () => setPaused((p) => !p);
  const toggleSound = () => setSound((s) => !s);
  const toggleHints = () => setShowHints((s) => !s);
  const undoMove = () => {
    let undone = 0;
    if (historyRef.current.length <= 1) return;
    if (chessRef.current.history().length > 0) {
      chessRef.current.undo();
      historyRef.current.pop();
      undone++;
    }
    if (chessRef.current.turn() === 'b' && chessRef.current.history().length > 0) {
      chessRef.current.undo();
      historyRef.current.pop();
      undone++;
    }
    boardRef.current = historyRef.current[historyRef.current.length - 1].slice();
    sideRef.current = chessRef.current.turn() === 'w' ? WHITE : BLACK;
    trailsRef.current = [];
    particlesRef.current = [];
    setSelected(null);
    setMoves([]);
    setSanLog((l) => l.slice(0, -undone));
    updateEval();
    updateMateHints();
    setStatus('Your move');
  };

  const copyMoves = () => {
    navigator.clipboard?.writeText(chessRef.current.pgn());
  };

  const moveLines = [];
  for (let i = 0; i < sanLog.length; i += 2) {
    moveLines.push(
      `${i / 2 + 1}. ${sanLog[i]}${sanLog[i + 1] ? ' ' + sanLog[i + 1] : ''}`
    );
  }

  return (
    <div className="h-full w-full max-w-[60ch] mx-auto flex flex-col items-center justify-center bg-ub-cool-grey text-white p-2 select-none">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onClick={handleClick}
        onKeyDown={handleKey}
        tabIndex={0}
        aria-label="Chess board"
        className="border border-gray-600"
      />
      <div className="mt-2 flex gap-2">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={undoMove}>
          Undo
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={togglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={toggleSound}>
          {sound ? 'Sound Off' : 'Sound On'}
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={toggleHints}>
          {showHints ? 'Hide Hints' : 'Mate in 1'}
        </button>
      </div>
      <div className="mt-2">{status}</div>
      <div className="mt-2 w-full" aria-label="Evaluation">
        <div
          className="h-4 bg-gray-700"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={evalPercent.toFixed(0)}
        >
          <div
            className={`h-full ${displayEval >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
            style={{ width: `${evalPercent}%` }}
          />
        </div>
        <div className="mt-1 text-sm" aria-live="polite">
          Eval: {(evalScore / 100).toFixed(2)}
        </div>
      </div>
      <div className="mt-1">ELO: {elo}</div>
      <ol
        className="mt-2 w-full h-24 overflow-y-auto bg-gray-800 p-2 text-sm font-mono"
        aria-label="Move history"
      >
        {moveLines.map((line, idx) => (
          <li key={idx}>{line}</li>
        ))}
      </ol>
      <button className="mt-1 px-2 py-1 bg-gray-700" onClick={copyMoves}>
        Copy Moves
      </button>
      <div className="mt-1 text-xs w-full break-words">
        PGN: {chessRef.current.pgn()}
      </div>
    </div>
  );
};

export default ChessGame;

