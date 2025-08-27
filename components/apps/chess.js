import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
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

// Optional props allow tests to initialise the board in specific states
// and control the AI thinking delay.
const ChessGame = ({ initialFen, aiDelay = 500 } = {}) => {
  const [game, setGame] = useState(() => new Chess(initialFen));
  const [board, setBoard] = useState(game.board());
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('Your move');
  const [highlight, setHighlight] = useState([]);
  const [premove, setPremove] = useState(null);
  const [lastMove, setLastMove] = useState([]);
  const [moveList, setMoveList] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [cursor, setCursor] = useState({ file: 0, rank: 0 });
  const [depth, setDepth] = useState(1);

  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);
  const timerRef = useRef(null);
  const aiTimerRef = useRef(null);

  const updateBoard = () => {
    const b = game.board().map((row) => [...row]);
    setBoard(b);
    setMoveList(game.history());
  };

  const updateStatus = () => {
    if (game.isCheckmate()) setStatus('Checkmate');
    else if (game.isDraw()) setStatus('Draw');
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
    updateStatus();
    startTimers();
    return () => {
      stopTimers();
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
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
    if (d === 0 || g.isGameOver()) return evaluateBoard(g);
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
    g.moves().forEach((move) => {
      g.move(move);
      const val = minimax(g, d - 1, !maximizing);
      g.undo();
      if ((maximizing && val > bestValue) || (!maximizing && val < bestValue)) {
        bestValue = val;
        bestMove = move;
      }
    });
    return bestMove;
  };

  const makeAIMove = () => {
    const moves = game.moves();
    if (moves.length === 0) {
      updateStatus();
      return;
    }
    aiTimerRef.current = setTimeout(() => {
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
    }, aiDelay);
  };

  const selectSquare = (square) => {
    const piece = game.get(square);
    if (piece && piece.color === 'w') {
      setSelected(square);
      const moves = game.moves({ square, verbose: true });
      setHighlight(moves.map((m) => m.to));
    }
  };

  const moveSelected = (square) => {
    if (!selected) return;
    const move = { from: selected, to: square, promotion: 'q' };
    if (game.turn() === 'b') {
      setPremove(move);
      setSelected(null);
      setHighlight([]);
      return;
    }
    const result = game.move(move);
    setSelected(null);
    setHighlight([]);
    if (result) {
      setLastMove([result.from, result.to]);
      updateBoard();
      updateStatus();
      makeAIMove();
    } else {
      updateBoard();
    }
  };

  const handleSquareClick = (file, rank) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    setCursor({ file, rank });
    if (selected) moveSelected(square);
    else selectSquare(square);
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
    const message =
      Object.keys(counts)
        .map((m) => `${m} (${counts[m]})`)
        .join(', ') || 'No data';
    // eslint-disable-next-line no-alert
    alert(message);
  };

  const renderSquare = (displayFile, displayRank) => {
    const file = flipped ? 7 - displayFile : displayFile;
    const rank = flipped ? displayRank : 7 - displayRank;
    const piece = board[rank][file];
    const squareName = 'abcdefgh'[file] + (rank + 1);
    const isSelected = selected === squareName;
    const squareColor = (file + rank) % 2 === 0 ? 'bg-gray-300' : 'bg-gray-700';
    const isHighlight = highlight.includes(squareName);
    const isLastMove = lastMove.includes(squareName);

    return (
      <div
        key={squareName}
        data-testid={squareName}
        onClick={() => handleSquareClick(file, 7 - rank)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          moveSelected(squareName);
        }}
        className={`w-11 h-11 md:w-12 md:h-12 flex items-center justify-center select-none ${squareColor} ${
          isSelected ? 'ring-2 ring-yellow-400' : ''
        } ${isHighlight ? 'bg-green-500 bg-opacity-50' : ''} ${
          isLastMove ? 'bg-yellow-500 bg-opacity-50' : ''
        }`}
      >
        {piece ? (
          <span
            draggable={piece.color === 'w'}
            onDragStart={() => selectSquare(squareName)}
            onDragEnd={() => {
              setSelected(null);
              setHighlight([]);
            }}
          >
            {pieceUnicode[piece.type][piece.color]}
          </span>
        ) : (
          ''
        )}
      </div>
    );
  };

  const files = flipped
    ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
    : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = flipped
    ? ['1', '2', '3', '4', '5', '6', '7', '8']
    : ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-2">
      <div className="relative">
        <div className="grid grid-cols-8">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((f) => renderSquare(f, r))
          )}
        </div>
        <div className="absolute -bottom-5 left-0 grid grid-cols-8 w-full text-xs">
          {files.map((f) => (
            <div key={f} className="text-center w-11 md:w-12">
              {f}
            </div>
          ))}
        </div>
        <div className="absolute top-0 -left-5 grid grid-rows-8 h-full text-xs">
          {ranks.map((r) => (
            <div key={r} className="flex items-center justify-center h-11 md:h-12">
              {r}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex space-x-2">
        <div>White: {whiteTime}s</div>
        <div>Black: {blackTime}s</div>
      </div>
      <div className="mt-2">{status}</div>
      <div className="mt-2">{moveList.join(' ')}</div>
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={undo}>
          Undo
        </button>
        <button
          className="px-2 py-1 bg-gray-700"
          onClick={() => setFlipped((f) => !f)}
        >
          Flip Board
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
    </div>
  );
};

export default ChessGame;

