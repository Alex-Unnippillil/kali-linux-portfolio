import React, { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Stockfish from 'stockfish';

const pieceUnicode: Record<string, { w: string; b: string }> = {
  p: { w: '♙', b: '♟' },
  r: { w: '♖', b: '♜' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  q: { w: '♕', b: '♛' },
  k: { w: '♔', b: '♚' },
};

type User = {
  name: string;
  rating: number;
  history: string[];
};

const loadUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('chess-user');
  return data ? JSON.parse(data) : null;
};

const saveUser = (u: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chess-user', JSON.stringify(u));
};

const ChessApp: React.FC = () => {
  const [game] = useState(new Chess());
  const [board, setBoard] = useState(game.board());
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [status, setStatus] = useState('Your move');
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [blunder, setBlunder] = useState(false);
  const [user, setUser] = useState<User | null>(loadUser);

  const engine = useRef<any>();
  const lastEval = useRef<number>(0);

  // Puzzle state
  const [puzzle, setPuzzle] = useState<{ fen: string; solution: string } | null>(
    null
  );
  const [puzzleStart, setPuzzleStart] = useState<number | null>(null);
  const [puzzleScore, setPuzzleScore] = useState<number | null>(null);

  // Opening explorer data (parsed once)
  const openingsRef = useRef<string[][] | null>(null);

  useEffect(() => {
    engine.current = Stockfish();
    engine.current.postMessage('uci');
    return () => {
      if (engine.current) engine.current.terminate();
    };
  }, []);

  const updateBoard = () => {
    setBoard(game.board());
  };

  const updateStatus = () => {
    if (game.in_checkmate()) {
      setStatus('Checkmate');
      if (user) {
        const history = [...user.history, game.pgn()];
        const rating = user.rating + (game.turn() === 'b' ? 10 : -10);
        const newUser = { ...user, history, rating };
        setUser(newUser);
        saveUser(newUser);
      }
    } else if (game.in_draw()) setStatus('Draw');
    else setStatus(game.turn() === 'w' ? 'Your move' : 'Waiting');
  };

  const analyze = () => {
    return new Promise<number>((resolve) => {
      const fen = game.fen();
      const handler = (e: MessageEvent) => {
        const line = e.data as string;
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
          const cp = Number(match[1]);
          setEvaluation(cp);
          setBlunder(lastEval.current - cp > 300);
          lastEval.current = cp;
          engine.current.removeEventListener('message', handler);
          resolve(cp);
        }
      };
      engine.current.addEventListener('message', handler);
      engine.current.postMessage(`position fen ${fen}`);
      engine.current.postMessage('go depth 12');
    });
  };

  const handleSquareClick = (file: number, rank: number) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    if (selected) {
      const move = game.move({ from: selected, to: square, promotion: 'q' });
      if (move) {
        setSelected(null);
        setHighlight([]);
        updateBoard();
        updateStatus();
        analyze();
        // puzzle check
        if (puzzle && move.san === puzzle.solution) {
          const time = puzzleStart ? Math.floor((Date.now() - puzzleStart) / 1000) : 0;
          setPuzzleScore(time);
          setPuzzle(null);
          setPuzzleStart(null);
          const key = 'chess-puzzle-scores';
          const scores = JSON.parse(localStorage.getItem(key) || '[]');
          scores.push({ date: new Date().toISOString(), time });
          localStorage.setItem(key, JSON.stringify(scores));
        }
      } else {
        setSelected(square);
        const moves = game.moves({ square, verbose: true });
        setHighlight(moves.map((m) => m.to));
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

  const reset = () => {
    game.reset();
    updateBoard();
    setSelected(null);
    setHighlight([]);
    setStatus('Your move');
    setBlunder(false);
    setEvaluation(null);
  };

  const loadPuzzle = async (daily = false) => {
    const text = await fetch('/chess/puzzles.pgn').then((res) => res.text());
    const blocks = text.trim().split(/\n\n/);
    let index = Math.floor(Math.random() * blocks.length);
    if (daily) index = new Date().getDate() % blocks.length;
    const block = blocks[index];
    const fen = block.match(/\[FEN "(.*)"\]/)?.[1];
    const move = block.split('\n').pop()?.trim().split(' ')[1];
    if (fen && move) {
      game.load(fen);
      updateBoard();
      setSelected(null);
      setHighlight([]);
      setStatus('Solve the puzzle');
      setPuzzle({ fen, solution: move });
      setPuzzleStart(Date.now());
      setPuzzleScore(null);
    }
  };

  const exploreOpenings = async () => {
    if (!openingsRef.current) {
      const text = await fetch('/openings/openings.pgn').then((r) => r.text());
      const games = text.trim().split(/\n\n\n/).map((g) => g.split(/\s+/).filter((m) => /^[a-hKQRBNOP0-9]/.test(m)));
      openingsRef.current = games;
    }
    const moves = game.history();
    const counts: Record<string, number> = {};
    openingsRef.current.forEach((g) => {
      const next = g[moves.length];
      if (g.slice(0, moves.length).join(' ') === moves.join(' ') && next) {
        counts[next] = (counts[next] || 0) + 1;
      }
    });
    const list = Object.entries(counts)
      .map(([m, c]) => `${m} (${c})`)
      .join(', ');
    // eslint-disable-next-line no-alert
    alert(list || 'No data');
  };

  const login = () => {
    // eslint-disable-next-line no-alert
    const name = prompt('Enter username');
    if (name) {
      const newUser: User = { name, rating: 1200, history: [] };
      setUser(newUser);
      saveUser(newUser);
    }
  };

  const renderSquare = (piece: any, file: number, rank: number) => {
    const squareName = 'abcdefgh'[file] + (8 - rank);
    const isSelected = selected === squareName;
    const squareColor = (file + rank) % 2 === 0 ? 'bg-gray-300' : 'bg-gray-700';
    const isHighlight = highlight.includes(squareName);
    return (
      <div
        key={squareName}
        onClick={() => handleSquareClick(file, rank)}
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center select-none ${squareColor} ${
          isSelected ? 'ring-2 ring-yellow-400' : ''
        } ${isHighlight ? 'bg-green-500 bg-opacity-50' : ''}`}
      >
        {piece ? pieceUnicode[piece.type][piece.color] : ''}
      </div>
    );
  };

  return (
    <div className="p-2 text-white bg-ub-cool-grey h-full w-full flex flex-col items-center">
      {!user && (
        <button className="mb-2 px-2 py-1 bg-gray-700" onClick={login}>
          Login
        </button>
      )}
      {user && (
        <div className="mb-2">{user.name} – Rating: {user.rating}</div>
      )}
      <div className="grid grid-cols-8">
        {board.map((row, r) => row.map((p, f) => renderSquare(p, f, r)))}
      </div>
      <div className="mt-2">{status}</div>
      {evaluation !== null && (
        <div className="mt-1">
          Eval: {(evaluation / 100).toFixed(2)} {blunder && 'Blunder!'}
        </div>
      )}
      {puzzleScore !== null && (
        <div className="mt-1">Puzzle solved in {puzzleScore}s</div>
      )}
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={() => loadPuzzle(false)}>
          Puzzle
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={() => loadPuzzle(true)}>
          Daily
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={exploreOpenings}>
          Openings
        </button>
      </div>
    </div>
  );
};

export default ChessApp;

