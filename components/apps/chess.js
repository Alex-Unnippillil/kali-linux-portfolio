import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { pointerHandlers } from '../../utils/pointer';
// Stockfish engine removed for compatibility; using simple AI instead

const pieceUnicode = {
  p: { w: '♙', b: '♟' },
  r: { w: '♖', b: '♜' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  q: { w: '♕', b: '♛' },
  k: { w: '♔', b: '♚' },
};

const initialTime = 5 * 60;

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [board, setBoard] = useState(game.board());
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('Your move');
  const [highlight, setHighlight] = useState([]);
  const [premove, setPremove] = useState(null);
  const [lastMove, setLastMove] = useState([]);
  const [skill, setSkill] = useState(5);
  const [depth, setDepth] = useState(1);
  const [suggestedMove, setSuggestedMove] = useState(null);
  const [cursor, setCursor] = useState({ file: 0, rank: 0 });

  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);
  const timerRef = useRef(null);

  const updateBoard = () => {
    setBoard(game.board());
  };

  const updateStatus = () => {
    if (game.in_checkmate()) setStatus('Checkmate');
    else if (game.in_draw()) setStatus('Draw');
    else setStatus(game.turn() === 'w' ? 'Your move' : 'AI thinking...');
  };

  const startTimers = () => {
    timerRef.current = setInterval(() => {
      setWhiteTime((t) => (game.turn() === 'w' ? t - 1 : t));
      setBlackTime((t) => (game.turn() === 'b' ? t - 1 : t));
    }, 1000);
  };

  const stopTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    updateBoard();
    startTimers();
    return () => {
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    const newGame = new Chess();
    setGame(newGame);
    setSelected(null);
    setHighlight([]);
    setPremove(null);
    setLastMove([]);
    setStatus('Your move');
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    updateBoard();
  };

  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const evaluateBoard = (g) => {
    let total = 0;
    g.board().forEach((row) =>
      row.forEach((piece) => {
        if (piece) {
          const val = pieceValues[piece.type];
          total += piece.color === 'w' ? val : -val;
        }
      })
    );
    return total;
  };

  const minimax = (g, d, isMax) => {
    if (d === 0 || g.game_over()) return evaluateBoard(g);
    const moves = g.moves();
    let best = isMax ? -Infinity : Infinity;
    moves.forEach((move) => {
      g.move(move);
      const val = minimax(g, d - 1, !isMax);
      g.undo();
      best = isMax ? Math.max(best, val) : Math.min(best, val);
    });
    return best;
  };

  const getBestMove = (g, d) => {
    const maximizing = g.turn() === 'w';
    let bestMove = null;
    let bestValue = maximizing ? -Infinity : Infinity;
    g.moves({ verbose: true }).forEach((move) => {
      g.move(move.san);
      const val = minimax(g, d - 1, !maximizing);
      g.undo();
      if (
        (maximizing && val > bestValue) ||
        (!maximizing && val < bestValue)
      ) {
        bestValue = val;
        bestMove = move;
      }
    });
    return bestMove;
  };

  const squareToCoords = (sq) => {
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - parseInt(sq[1], 10);
    return { x: file + 0.5, y: rank + 0.5 };
  };

  const makeAIMove = () => {
    const moves = game.moves();
    if (moves.length > 0) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      const aiResult = game.move(move, { sloppy: true });
      if (aiResult) setLastMove([aiResult.from, aiResult.to]);

      updateBoard();
      updateStatus();
      if (premove) {
        const result = game.move(premove, { sloppy: true });
        setPremove(null);
        if (result) {
          setLastMove([result.from, result.to]);
          updateBoard();
          updateStatus();
        }
      }
    }
  };

  useEffect(() => {
    if (game.turn() === 'w') {
      const copy = new Chess(game.fen());
      const best = getBestMove(copy, depth);
      setSuggestedMove(best);
    } else {
      setSuggestedMove(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, depth]);

  const handleSquareClick = (file, rank) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    setCursor({ file, rank });

    if (game.turn() === 'b') {
      if (selected) {
        const move = { from: selected, to: square, promotion: 'q' };
        setPremove(move);
        setSelected(null);
        setHighlight([]);
      } else {
        setSelected(square);
      }
      return;
    }

    if (selected) {
      const move = { from: selected, to: square, promotion: 'q' };
      const result = game.move(move);
      if (result) {
        setLastMove([result.from, result.to]);
        updateBoard();
        setSelected(null);
        setHighlight([]);
        updateStatus();
        makeAIMove();
      } else {
        setSelected(square);
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelected(square);
        const moves = game.moves({ square, verbose: true });
        setHighlight(moves.map((m) => m.to));
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setCursor((c) => ({ ...c, rank: Math.max(c.rank - 1, 0) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setCursor((c) => ({ ...c, rank: Math.min(c.rank + 1, 7) }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCursor((c) => ({ ...c, file: Math.max(c.file - 1, 0) }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCursor((c) => ({ ...c, file: Math.min(c.file + 1, 7) }));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSquareClick(cursor.file, cursor.rank);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const undo = () => {
    game.undo();
    game.undo();
    const history = game.history({ verbose: true });
    const last = history[history.length - 1];
    setLastMove(last ? [last.from, last.to] : []);
    updateBoard();
    updateStatus();
  };

  const exportFen = () => {
    // eslint-disable-next-line no-alert
    alert(game.fen());
  };

  const exportPgn = () => {
    // eslint-disable-next-line no-alert
    alert(game.pgn());
  };

  const importFen = () => {
    // eslint-disable-next-line no-alert
    const fen = prompt('Enter FEN');
    if (fen) {
      game.load(fen);
      setLastMove([]);
      updateBoard();
      updateStatus();
    }
  };

  const importPgn = () => {
    // eslint-disable-next-line no-alert
    const pgn = prompt('Enter PGN');
    if (pgn) {
      game.load_pgn(pgn, { sloppy: true });
      const history = game.history({ verbose: true });
      const last = history[history.length - 1];
      setLastMove(last ? [last.from, last.to] : []);
      updateBoard();
      updateStatus();
    }
  };

  const loadPuzzle = async () => {
    const text = await fetch('/chess/puzzles.pgn').then((res) => res.text());
    const blocks = text.trim().split(/\n\n/);
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const fenMatch = block.match(/\[FEN "(.*)"\]/);
    if (fenMatch) {
      game.load(fenMatch[1]);
      setPremove(null);
      setSelected(null);
      setHighlight([]);
      setLastMove([]);
      updateBoard();
      updateStatus();
    }
  };

  const exploreOpenings = async () => {
    const text = await fetch('/chess/openings.pgn').then((res) => res.text());
    const games = text.trim().split(/\n\n\n/);
    const counts = {};
    games.forEach((pgn) => {
      const cg = new Chess();
      cg.load_pgn(pgn, { sloppy: true });
      const history = cg.history();
      const move = history[game.history().length];
      if (move) counts[move] = (counts[move] || 0) + 1;
    });
    const message = Object.keys(counts)
      .map((m) => `${m} (${counts[m]})`)
      .join(', ') || 'No data';
    // eslint-disable-next-line no-alert
    alert(message);
  };

  const renderSquare = (piece, file, rank) => {
    const squareName = 'abcdefgh'[file] + (8 - rank);
    const isSelected = selected === squareName;
    const squareColor = (file + rank) % 2 === 0 ? 'bg-gray-300' : 'bg-gray-700';
    const isHighlight = highlight.includes(squareName);
    const isLastMove = lastMove.includes(squareName);

    return (
      <div
        key={squareName}
        {...pointerHandlers(() => handleSquareClick(file, rank))}
        className={`w-11 h-11 md:w-12 md:h-12 flex items-center justify-center select-none ${squareColor} ${
          isSelected ? 'ring-2 ring-yellow-400' : ''
        } ${isHighlight ? 'bg-green-500 bg-opacity-50' : ''} ${
          isLastMove ? 'bg-yellow-500 bg-opacity-50' : ''
        }`}

      >
        {piece ? pieceUnicode[piece.type][piece.color] : ''}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-2">
      <div className="relative">
        <div className="grid grid-cols-8">
          {board.map((row, rank) =>
            row.map((piece, file) => renderSquare(piece, file, rank))
          )}
        </div>
        {suggestedMove && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            viewBox="0 0 8 8"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="0.3"
                markerHeight="0.3"
                refX="0.15"
                refY="0.15"
                orient="auto"
              >
                <polygon points="0 0, 0.3 0.15, 0 0.3" className="arrowhead" />
              </marker>
            </defs>
            <line
              x1={squareToCoords(suggestedMove.from).x}
              y1={squareToCoords(suggestedMove.from).y}
              x2={squareToCoords(suggestedMove.to).x}
              y2={squareToCoords(suggestedMove.to).y}
              className="suggestion-arrow"
            />
            <circle
              cx={squareToCoords(suggestedMove.to).x}
              cy={squareToCoords(suggestedMove.to).y}
              r="0.2"
              className="hint-circle"
            />
          </svg>
        )}
      </div>
      <div className="mt-2 flex space-x-2">
        <div>White: {whiteTime}s</div>
        <div>Black: {blackTime}s</div>
      </div>
      <div className="mt-2">{status}</div>
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={undo}>
          Undo
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={loadPuzzle}>
          Puzzle
        </button>
        <button
          className="px-2 py-1 bg-gray-700"
          onClick={exploreOpenings}
        >
          Opening Explorer
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={exportFen}>
          Export FEN
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={exportPgn}>
          Export PGN
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={importFen}>
          Import FEN
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={importPgn}>
          Import PGN
        </button>
      </div>
      <div className="mt-2 flex items-center">
        <label className="mr-2">Depth: {depth}</label>
        <input
          type="range"
          min="1"
          max="3"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        />
      </div>
      <style jsx>{`
        .suggestion-arrow {
          stroke: rgba(0, 255, 0, 0.8);
          stroke-width: 0.15;
          fill: none;
          marker-end: url(#arrowhead);
        }
        .arrowhead {
          fill: rgba(0, 255, 0, 0.8);
        }
        .hint-circle {
          fill: rgba(0, 255, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ChessGame;

