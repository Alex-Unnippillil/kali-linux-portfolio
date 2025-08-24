import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, Square, PieceSymbol, Piece } from 'chess.js';

const pieceUnicode: Record<PieceSymbol, { w: string; b: string }> = {
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
  const [bestLine, setBestLine] = useState('');
  const [blunder, setBlunder] = useState(false);
  const [user, setUser] = useState<User | null>(loadUser);

  const engine = useRef<any>(null);
  const lastEval = useRef<number>(0);

  // Arrows/lines state
  const [arrows, setArrows] = useState<{ from: string; to: string }[]>([]);
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);

  // Puzzle state
  const [puzzle, setPuzzle] = useState<{ fen: string; solution: string } | null>(
    null
  );
  const [puzzleStart, setPuzzleStart] = useState<number | null>(null);
  const [puzzleScore, setPuzzleScore] = useState<number | null>(null);

  // Puzzle rush state
  const [rushActive, setRushActive] = useState(false);
  const [rushScore, setRushScore] = useState(0);
  const [rushTime, setRushTime] = useState(0);
  const rushStartRef = useRef(0);
  const rushIndexRef = useRef(0);
  const rushPuzzlesRef = useRef<{ fen: string; solution: string }[]>([]);

  // Opening explorer data (parsed once)
  const openingsRef = useRef<string[][] | null>(null);

  const stopAnalysis = useCallback(() => {
    if (engine.current) engine.current.postMessage('stop');
  }, []);

  const startAnalysis = useCallback(() => {
    if (!engine.current) return;
    const fen = game.fen();
    engine.current.postMessage('stop');
    engine.current.postMessage(`position fen ${fen}`);
    engine.current.postMessage('go infinite');
  }, [game]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const StockfishModule: any = await import(
        /* webpackIgnore: true */ 'stockfish/src/stockfish-nnue-16.js'
      );
      if (!mounted) return;
      engine.current = StockfishModule();
      engine.current.postMessage('uci');
      engine.current.onmessage = (e: MessageEvent) => {
        const line = e.data as string;
        const match = line.match(/info .*score cp (-?\d+).*pv (.*)/);
        if (match) {
          const cp = Number(match[1]);
          setEvaluation(cp);
          setBlunder(lastEval.current - cp > 300);
          lastEval.current = cp;
          setBestLine(match[2]);
        }
      };
      startAnalysis();
    })();
    return () => {
      mounted = false;
      if (engine.current) engine.current.terminate();
    };
  }, [startAnalysis]);

  const updateBoard = () => {
    setBoard(game.board());
  };

  const updateStatus = () => {
    if (game.isCheckmate()) {
      setStatus('Checkmate');
      if (user) {
        const history = [...user.history, game.pgn()];
        const rating = user.rating + (game.turn() === 'b' ? 10 : -10);
        const newUser = { ...user, history, rating };
        setUser(newUser);
        saveUser(newUser);
      }
    } else if (game.isDraw()) setStatus('Draw');
    else setStatus(game.turn() === 'w' ? 'Your move' : 'Waiting');
  };

  const makeMove = (to: string) => {
    if (!selected) return;
    const move = game.move({ from: selected as Square, to: to as Square, promotion: 'q' });
    stopAnalysis();
    if (move) {
      setSelected(null);
      setHighlight([]);
      updateBoard();
      updateStatus();
      startAnalysis();
      if (puzzle && move.san === puzzle.solution) {
        const time = puzzleStart ? Math.floor((Date.now() - puzzleStart) / 1000) : 0;
        if (rushActive) {
          setRushScore((s) => s + 1);
          rushIndexRef.current += 1;
          loadRushPuzzle();
        } else {
          setPuzzleScore(time);
          setPuzzle(null);
          setPuzzleStart(null);
          const key = 'chess-puzzle-scores';
          const scores = JSON.parse(localStorage.getItem(key) || '[]');
          scores.push({ date: new Date().toISOString(), time });
          localStorage.setItem(key, JSON.stringify(scores));
        }
      } else if (puzzle && rushActive) {
        endRush();
      }
    } else {
      setSelected(null);
      setHighlight([]);
    }
  };

  const handleSquareClick = (file: number, rank: number) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    if (selected) {
      makeMove(square);
    } else {
      const piece: Piece | undefined = game.get(square as Square);
      if (piece && piece.color === game.turn()) {
        setSelected(square);
        const moves = game.moves({ square: square as Square, verbose: true });
        setHighlight(moves.map((m) => m.to));
      }
    }
  };

  const handleDragStart = (file: number, rank: number) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    const piece: Piece | undefined = game.get(square as Square);
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      const moves = game.moves({ square: square as Square, verbose: true });
      setHighlight(moves.map((m) => m.to));
    }
  };

  const handleDrop = (file: number, rank: number) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    makeMove(square);
  };

  const reset = () => {
    game.reset();
    updateBoard();
    setSelected(null);
    setHighlight([]);
    setStatus('Your move');
    setBlunder(false);
    setEvaluation(null);
    setBestLine('');
    setPuzzle(null);
    setPuzzleScore(null);
    setRushActive(false);
    setRushScore(0);
    setRushTime(0);
    stopAnalysis();
    startAnalysis();
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

  const loadRushPuzzle = () => {
    const p = rushPuzzlesRef.current[rushIndexRef.current];
    if (!p) {
      endRush();
      return;
    }
    game.load(p.fen);
    updateBoard();
    setSelected(null);
    setHighlight([]);
    setStatus(`Puzzle Rush #${rushIndexRef.current + 1}`);
    setPuzzle({ fen: p.fen, solution: p.solution });
    setPuzzleStart(Date.now());
  };

  const endRush = () => {
    setRushActive(false);
    setPuzzle(null);
    setPuzzleStart(null);
    setStatus(`Rush score: ${rushScore}`);
    const key = 'chess-rush-scores';
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    scores.push({ date: new Date().toISOString(), score: rushScore });
    localStorage.setItem(key, JSON.stringify(scores));
  };

  const startPuzzleRush = async () => {
    const text = await fetch('/chess/puzzles.pgn').then((res) => res.text());
    const blocks = text.trim().split(/\n\n/);
    const puzzles = blocks
      .map((b) => {
        const fen = b.match(/\[FEN "(.*)"\]/)?.[1];
        const move = b.split('\n').pop()?.trim().split(' ')[1];
        return fen && move ? { fen, solution: move } : null;
      })
      .filter(Boolean) as { fen: string; solution: string }[];
    const day = new Date().getDate() % puzzles.length;
    rushPuzzlesRef.current = puzzles.slice(day).concat(puzzles.slice(0, day));
    rushIndexRef.current = 0;
    rushStartRef.current = Date.now();
    setRushScore(0);
    setRushTime(0);
    setRushActive(true);
    loadRushPuzzle();
  };

  useEffect(() => {
    if (!rushActive) return;
    const int = setInterval(() => {
      const elapsed = Math.floor((Date.now() - rushStartRef.current) / 1000);
      setRushTime(elapsed);
      if (elapsed >= 60) endRush();
    }, 1000);
    return () => clearInterval(int);
  }, [rushActive]);

  const handleContextMenu = (
    file: number,
    rank: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const square = 'abcdefgh'[file] + (8 - rank);
    if (!arrowFrom) setArrowFrom(square);
    else {
      setArrows([...arrows, { from: arrowFrom, to: square }]);
      setArrowFrom(null);
    }
  };

  const clearArrows = () => {
    setArrows([]);
    setArrowFrom(null);
  };

  const exportPGN = () => {
    const pgn = game.pgn();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pgn)
        .then(() => {
          // eslint-disable-next-line no-alert
          alert('PGN copied');
        })
        .catch(() => {
          // eslint-disable-next-line no-alert
          alert('Failed to copy PGN. Please copy manually.');
        });
    } else {
      // eslint-disable-next-line no-alert
      alert('Clipboard not supported. Please copy manually.');
    }
  };

  const importPGN = () => {
    // eslint-disable-next-line no-alert
    const pgn = prompt('Paste PGN');
    if (pgn) {
      try {
        game.loadPgn(pgn);
        updateBoard();
        setSelected(null);
        setHighlight([]);
        updateStatus();
        startAnalysis();
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert('Invalid PGN');
      }
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
    const draggable = !!(piece && piece.color === game.turn());
    return (
      <div
        key={squareName}
        onClick={() => handleSquareClick(file, rank)}
        onContextMenu={(e) => handleContextMenu(file, rank, e)}
        onDragStart={() => handleDragStart(file, rank)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(file, rank)}
        draggable={draggable}
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center select-none ${squareColor} ${
          isSelected ? 'ring-2 ring-yellow-400' : ''
        } ${isHighlight ? 'bg-green-500 bg-opacity-50' : ''}`}
      >
        {piece ? pieceUnicode[piece.type as PieceSymbol][piece.color as 'w' | 'b'] : ''}
      </div>
    );
  };

  return (
    <div className="p-2 text-white bg-panel h-full w-full flex flex-col items-center">
      {!user && (
        <button className="mb-2 px-2 py-1 bg-gray-700" onClick={login}>
          Login
        </button>
      )}
      {user && (
        <div className="mb-2">{user.name} – Rating: {user.rating}</div>
      )}
      <div className="relative">
        <div className="grid grid-cols-8">
          {board.map((row, r) => row.map((p, f) => renderSquare(p, f, r)))}
        </div>
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="red" />
            </marker>
          </defs>
          {arrows.map((a, i) => {
            const fromFile = 'abcdefgh'.indexOf(a.from[0]);
            const fromRank = 8 - parseInt(a.from[1], 10);
            const toFile = 'abcdefgh'.indexOf(a.to[0]);
            const toRank = 8 - parseInt(a.to[1], 10);
            const x1 = ((fromFile + 0.5) / 8) * 100;
            const y1 = ((fromRank + 0.5) / 8) * 100;
            const x2 = ((toFile + 0.5) / 8) * 100;
            const y2 = ((toRank + 0.5) / 8) * 100;
            return (
              <line
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="red"
                strokeWidth="4"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-2">{status}</div>
      {evaluation !== null && (
        <div className="mt-1">
          Eval: {(evaluation / 100).toFixed(2)} {blunder && 'Blunder!'}
          {bestLine && <div className="text-xs">PV: {bestLine}</div>}
        </div>
      )}
      {rushActive && (
        <div className="mt-1">Rush: {rushScore} – {rushTime}s</div>
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
        <button className="px-2 py-1 bg-gray-700" onClick={startPuzzleRush}>
          Puzzle Rush
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={exportPGN}>
          Export
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={importPGN}>
          Import
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={clearArrows}>
          Clear Arrows
        </button>
      </div>
    </div>
  );
};

export default ChessApp;

