import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameLayout from './GameLayout';
import usePersistedState from '../../hooks/usePersistedState';
import useGameAudio from '../../hooks/useGameAudio';
import { useGamePersistence, useGameSettings } from './useGameControls';
import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  hasMoves,
  evaluateBoard,
  cloneBoard,
  normalizeBoard,
} from './checkers/engine';

const TILE = 50;
const BOARD_PIXELS = TILE * 8;

// transposition table for caching board evaluations
const tt = new Map();

const boardKey = (board, color, depth) =>
  board
    .map((row) =>
      row
        .map((p) =>
          p ? `${p.color[0]}${p.king ? 'k' : 'm'}` : '.'
        )
        .join(''),
    )
    .join('') + `${color}${depth}`;

// minimax with alpha-beta pruning and transposition table
const minimax = (
  board,
  color,
  depth,
  enforceCapture,
  alpha = -Infinity,
  beta = Infinity,
) => {
  const key = boardKey(board, color, depth);
  if (tt.has(key)) return tt.get(key);
  if (depth === 0 || !hasMoves(board, color, enforceCapture)) {
    const res = { score: evaluateBoard(board) };
    tt.set(key, res);
    return res;
  }
  const moves = getAllMoves(board, color, enforceCapture);
  let best = null;
  if (color === 'red') {
    let max = -Infinity;
    for (const m of moves) {
      const { board: nb } = applyMove(board, m);
      const { score } = minimax(nb, 'black', depth - 1, enforceCapture, alpha, beta);
      if (score > max) {
        max = score;
        best = m;
      }
      alpha = Math.max(alpha, max);
      if (beta <= alpha) break;
    }
    const res = { score: max, move: best };
    tt.set(key, res);
    return res;
  }
  let min = Infinity;
  for (const m of moves) {
    const { board: nb } = applyMove(board, m);
    const { score } = minimax(nb, 'red', depth - 1, enforceCapture, alpha, beta);
    if (score < min) {
      min = score;
      best = m;
    }
    beta = Math.min(beta, min);
    if (beta <= alpha) break;
  }
  const res = { score: min, move: best };
  tt.set(key, res);
  return res;
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

  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const [hintMoves, setHintMoves] = useState([]);
  const hintMovesRef = useRef(hintMoves);
  useEffect(() => {
    hintMovesRef.current = hintMoves;
  }, [hintMoves]);

  const { paused, togglePause, muted: mutedSetting, toggleMute } =
    useGameSettings('checkers');
  const { context: audioContext, setMuted: setAudioMuted } = useGameAudio();
  const [difficulty, setDifficulty] = useState('hard');
  const [wins, setWins] = useState({ player: 0, ai: 0 });
  const [winner, setWinner] = useState(null);
  const [requireCapture, setRequireCapture] = usePersistedState(
    'checkersRequireCapture',
    true,
  );
  const {
    saveSnapshot,
    loadSnapshot,
    getHighScore,
    setHighScore: persistHighScore,
  } = useGamePersistence('checkers');
  const [bestMargin, setBestMargin] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const recordWin = useCallback(
    (color) => {
      setWins((prev) => {
        const next =
          color === 'red'
            ? { ...prev, player: prev.player + 1 }
            : { ...prev, ai: prev.ai + 1 };
        if (color === 'red') {
          const margin = next.player - next.ai;
          setBestMargin((current) => {
            if (margin > current) {
              persistHighScore(margin);
              return margin;
            }
            return current;
          });
        }
        return next;
      });
    },
    [persistHighScore],
  );

  useEffect(() => {
    setAudioMuted(mutedSetting);
  }, [mutedSetting, setAudioMuted]);

  useEffect(() => {
    const snapshot = loadSnapshot();
    const storedHigh = getHighScore();
    let marginFromWins = 0;
    if (snapshot) {
      const {
        board: storedBoard,
        turn: storedTurn,
        history: storedHistory,
        wins: storedWins,
        requireCapture: storedRequireCapture,
        difficulty: storedDifficulty,
        selected: storedSelected,
        moves: storedMoves,
        hintMoves: storedHintMoves,
        winner: storedWinner,
      } = snapshot;
      const normalized = normalizeBoard(storedBoard);
      if (normalized) {
        setBoard(normalized);
        boardRef.current = normalized;
      }
      if (storedTurn === 'red' || storedTurn === 'black') {
        setTurn(storedTurn);
        turnRef.current = storedTurn;
      }
      if (Array.isArray(storedHistory)) {
        setHistory(storedHistory);
        historyRef.current = storedHistory;
      }
      if (storedWins && typeof storedWins.player === 'number') {
        setWins(storedWins);
        marginFromWins = storedWins.player - (storedWins.ai || 0);
      }
      if (typeof storedRequireCapture === 'boolean') {
        setRequireCapture(storedRequireCapture);
      }
      if (storedDifficulty) {
        setDifficulty(storedDifficulty);
      }
      if (storedSelected) {
        setSelected(storedSelected);
      }
      if (storedMoves) {
        setMoves(storedMoves);
      }
      if (storedHintMoves) {
        setHintMoves(storedHintMoves);
      }
      if (storedWinner) {
        setWinner(storedWinner);
      }
    }
    const storedMargin =
      snapshot?.bestMargin && typeof snapshot.bestMargin === 'number'
        ? snapshot.bestMargin
        : 0;
    setBestMargin(Math.max(storedHigh, storedMargin, marginFromWins));
    setHydrated(true);
  }, [getHighScore, loadSnapshot, setRequireCapture]);

  useEffect(() => {
    if (!hydrated) return;
    saveSnapshot({
      board: boardRef.current,
      turn: turnRef.current,
      history: historyRef.current,
      wins,
      requireCapture,
      difficulty,
      selected: selectedRef.current,
      moves: movesRef.current,
      hintMoves: hintMovesRef.current,
      winner,
      bestMargin,
    });
  }, [
    hydrated,
    board,
    turn,
    history,
    wins,
    requireCapture,
    difficulty,
    selected,
    moves,
    hintMoves,
    winner,
    bestMargin,
    saveSnapshot,
  ]);

  const playBeep = useCallback(() => {
    if (mutedSetting) return;
    const ctx = audioContext;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 500;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const stopAt = ctx.currentTime + 0.1;
      osc.start();
      osc.stop(stopAt);
    } catch (e) {
      // ignore
    }
  }, [audioContext, mutedSetting]);

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
      if (hintMovesRef.current.length) {
        ctx.strokeStyle = 'cyan';
        for (const m of hintMovesRef.current) {
          ctx.strokeRect(m.from[1] * TILE + 10, m.from[0] * TILE + 10, TILE - 20, TILE - 20);
          ctx.strokeRect(m.to[1] * TILE + 10, m.to[0] * TILE + 10, TILE - 20, TILE - 20);
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
      setHistory((h) => [
        ...h,
        { board: cloneBoard(boardRef.current), turn: turnRef.current },
      ]);
      const { board: nb, capture } = applyMove(boardRef.current, move);
      setBoard(nb);
      boardRef.current = nb;
      setHintMoves([]);
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
      if (!hasMoves(nb, next, requireCapture)) {
        setWinner(turnRef.current);
        recordWin(turnRef.current);
      }
    },
    [playBeep, requireCapture, recordWin]
  );

  const aiMove = useCallback(() => {
    let move;
    if (difficulty === 'easy') {
      const moves = getAllMoves(boardRef.current, 'black', requireCapture);
      move = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === 'medium') {
      tt.clear();
      ({ move } = minimax(boardRef.current, 'black', 2, requireCapture));
    } else {
      tt.clear();
      ({ move } = minimax(boardRef.current, 'black', 3, requireCapture));
    }
    if (move) makeMove(move);
    else {
      setWinner('red');
      recordWin('red');
    }
  }, [makeMove, difficulty, requireCapture, recordWin]);

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
    setHintMoves([]);
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
      const all = getAllMoves(boardRef.current, 'red', false);
      const pieceMoves = getPieceMoves(boardRef.current, r, c, false);
      const mustCapture = requireCapture && all.some((m) => m.captured);
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

  const showHint = () => {
    if (turnRef.current !== 'red' || winner) return;
    const moves = getAllMoves(boardRef.current, 'red', requireCapture);
    setHintMoves(moves);
  };

  const undo = () => {
    if (!historyRef.current.length) return;
    const { board: prevBoard, turn: prevTurn } =
      historyRef.current[historyRef.current.length - 1];
    const newHist = historyRef.current.slice(0, -1);
    setHistory(newHist);
    boardRef.current = prevBoard;
    setBoard(prevBoard);
    setTurn(prevTurn);
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setHintMoves([]);
  };

  const reset = () => {
    const b = createBoard();
    setBoard(b);
    boardRef.current = b;
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setHistory([]);
    historyRef.current = [];
    setHintMoves([]);
  };

  const handlePauseChange = useCallback(
    (next) => {
      if (next !== paused) togglePause();
    },
    [paused, togglePause],
  );

  return (
    <GameLayout
      gameId="checkers"
      score={wins.player}
      highScore={bestMargin}
      paused={paused}
      onPauseChange={handlePauseChange}
    >
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
      <label className="mb-2 text-sm">
        <input
          type="checkbox"
          checked={requireCapture}
          onChange={(e) => setRequireCapture(e.target.checked)}
          className="mr-1"
        />
        Require capture
      </label>
      <div className="space-x-2 mb-2">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={undo}
        >
          Undo
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={toggleMute}
        >
          {mutedSetting ? 'Sound Off' : 'Sound On'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={showHint}
        >
          Hint
        </button>
      </div>
      <div className="text-sm">Wins: You {wins.player} - AI {wins.ai}</div>
      </div>
    </GameLayout>
  );
};

export default Checkers;

