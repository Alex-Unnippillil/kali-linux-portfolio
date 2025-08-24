import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/** Generate all possible winning line combinations for a given board size. */
const generateWinningLines = (size: number): number[][] => {
  const lines: number[][] = [];
  // rows
  for (let r = 0; r < size; r += 1) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  }
  // columns
  for (let c = 0; c < size; c += 1) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  // diagonals
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => (i + 1) * size - i - 1));
  return lines;
};

/** Determine the winner of the current board of arbitrary size. */
export const checkWinner = (
  board: (string | null)[],
  size: number,
): { winner: string | null; line: number[] } => {
  const lines = generateWinningLines(size);
  for (const line of lines) {
    const [a, ...rest] = line;
    if (board[a] && rest.every((i) => board[i] === board[a])) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

/**
 * Negamax with alpha-beta pruning for optimal play on variable-sized boards.
 */
export const negamax = (
  board: (string | null)[],
  player: 'X' | 'O',
  size: number,
  alpha = -Infinity,
  beta = Infinity,
): { index?: number; score: number } => {
  const opponent = player === 'X' ? 'O' : 'X';
  const { winner } = checkWinner(board, size);
  if (winner === player) return { score: 1 };
  if (winner === opponent) return { score: -1 };
  if (winner === 'draw') return { score: 0 };

  let best = { index: -1, score: -Infinity };
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    board[i] = player;
    const result = negamax(board, opponent, size, -beta, -alpha);
    const score = -result.score;
    board[i] = null;
    if (score > best.score) {
      best = { index: i, score };
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
};

const TicTacToe: React.FC = () => {
  // Game state
  const [size, setSize] = useState(3);
  const [history, setHistory] = useState<(string | null)[][]>([
    Array(3 * 3).fill(null),
  ]);
  const [step, setStep] = useState(0);
  const board = history[step];
  const [status, setStatus] = useState('Choose X or O');
  const [player, setPlayer] = useState<'X' | 'O' | null>(null);
  const [ai, setAi] = useState<'X' | 'O' | null>(null);
  // Difficulty ranges from 0 (easy) to 1 (hard). On hard the AI is unbeatable.
  const [difficulty, setDifficulty] = useState(1);
  const [aiMoves, setAiMoves] = useState(0);
  // Scores for each available move – used for visualisation
  const [moveEvals, setMoveEvals] = useState<Record<number, number>>({});
  const [hintMove, setHintMove] = useState<number | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ X: number; O: number; draw: number }>(
    { X: 0, O: 0, draw: 0 },
  );
  const [selected, setSelected] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, streak: 0 });

  // WebSocket ref for multiplayer support
  const wsRef = useRef<WebSocket | null>(null);

  // Establish websocket connection once on mount
  useEffect(() => {
    try {
      const ws = new WebSocket('ws://localhost:1234');
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.type === 'move' && typeof data.index === 'number' && data.player) {
            applyMove(data.index, data.player);
          }
        } catch {
          // ignore malformed messages
        }
      };
      return () => {
        ws.close();
      };
    } catch {
      // Ignore websocket errors in non‑WS environments
    }
    return undefined;
  }, []);

  // Helper to push new move into history
  const applyMove = (idx: number, p: string) => {
    const current = history.slice(0, step + 1);
    const newBoard = current[current.length - 1].slice();
    if (newBoard[idx] || checkWinner(newBoard, size).winner) return;
    newBoard[idx] = p;
    setHistory([...current, newBoard]);
    setStep(current.length);
  };

  // Send move to websocket peers
  const sendMove = (idx: number, p: string) => {
    try {
      wsRef.current?.send(JSON.stringify({ type: 'move', index: idx, player: p }));
    } catch {
      // no-op
    }
  };

  // Start a new game choosing player symbol
  const startGame = (p: 'X' | 'O') => {
    const a = p === 'X' ? 'O' : 'X';
    setPlayer(p);
    setAi(a);
    setStatus(p === 'X' ? 'Your turn' : "AI's turn");
    setHistory([Array(size * size).fill(null)]);
    setStep(0);
    setAiMoves(0);
    setMoveEvals({});
    setHintMove(null);
    setWinningLine([]);
    setSelected(0);
  };

  // Handle local board click
  const handleClick = (idx: number) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board, size).winner) return;
    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const currentTurn = isXTurn ? 'X' : 'O';
    if (currentTurn !== player) return;
    applyMove(idx, player);
    sendMove(idx, player);
    setMoveEvals({});
    setHintMove(null);
    setSelected(idx);
  };

  // Fetch leaderboard on mount
  useEffect(() => {
    fetch('/api/tictactoe/leaderboard')
      .then((res) => res.json())
      .then((data) => data?.leaderboard && setLeaderboard(data.leaderboard))
      .catch(() => {
        /* ignore */
      });
  }, []);

  // Save result to backend service
  const saveResult = (winner: string) => {
    fetch('/api/tictactoe/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner }),
    })
      .then((res) => res.json())
      .then((data) => data?.leaderboard && setLeaderboard(data.leaderboard))
      .catch(() => {
        /* ignore */
      });
  };

  // Load stats from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem('ttt-stats');
      if (s) setStats(JSON.parse(s));
    } catch {
      /* ignore */
    }
  }, []);

  const updateStats = (result: 'win' | 'loss' | 'draw') => {
    setStats((prev) => {
      const next = { ...prev };
      if (result === 'win') {
        next.wins += 1;
        next.streak = prev.streak >= 0 ? prev.streak + 1 : 1;
      } else if (result === 'loss') {
        next.losses += 1;
        next.streak = prev.streak <= 0 ? prev.streak - 1 : -1;
      } else {
        next.draws += 1;
        next.streak = 0;
      }
      try {
        localStorage.setItem('ttt-stats', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // React to board changes – AI moves and game over logic
  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = checkWinner(board, size);
    if (winner) {
      if (winner !== 'draw') {
        setWinningLine(line);
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      }
      setStatus(
        winner === 'draw' ? "It's a draw" : winner === player ? 'You win!' : 'You lose!',
      );
      saveResult(winner);
      updateStats(winner === 'draw' ? 'draw' : winner === player ? 'win' : 'loss');
      return;
    }

    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const aiTurn = (ai === 'X' && isXTurn) || (ai === 'O' && !isXTurn);
    if (aiTurn) {
      const available = board
        .map((v, i) => (v ? null : i))
        .filter((v) => v !== null) as number[];

      const evaluations = available.map((idx) => {
        const newBoard = board.slice();
        newBoard[idx] = ai;
        const result = negamax(newBoard, ai === 'X' ? 'O' : 'X', size);
        const score = -result.score;
        return { index: idx, score };
      });

      setMoveEvals(Object.fromEntries(evaluations.map((e) => [e.index, e.score])));

      const noisy = evaluations.map((e) => ({
        index: e.index,
        score: e.score + (Math.random() * 2 - 1) * (1 - difficulty),
      }));

      const best = noisy.reduce(
        (a, b) => (b.score > a.score ? b : a),
        { index: -1, score: -Infinity },
      );
      const index = best.index;

      if (index !== undefined && index >= 0) {
        setTimeout(() => {
          applyMove(index, ai);
          setAiMoves((m) => m + 1);
        }, 200);
      }
    } else {
      const available = board
        .map((v, i) => (v ? null : i))
        .filter((v) => v !== null) as number[];

      const evaluations = available.map((idx) => {
        const newBoard = board.slice();
        newBoard[idx] = player;
        const result = negamax(newBoard, player === 'X' ? 'O' : 'X', size);
        const score = -result.score;
        return { index: idx, score };
      });

      setMoveEvals(Object.fromEntries(evaluations.map((e) => [e.index, e.score])));
      const best = evaluations.reduce(
        (a, b) => (b.score > a.score ? b : a),
        { index: -1, score: -Infinity },
      );
      setHintMove(best.index);
      setStatus('Your turn');
    }
  }, [board, player, ai, difficulty, size]);

  // Jump to a specific move in history
  const jumpTo = (move: number) => {
    setHistory(history.slice(0, move + 1));
    setStep(move);
    setAiMoves(Math.floor(move / 2));
    setMoveEvals({});
    setHintMove(null);
    setWinningLine([]);
    setSelected(0);
  };

  // Reset entire game
  const reset = () => {
    setPlayer(null);
    setAi(null);
    setStatus('Choose X or O');
    setHistory([Array(size * size).fill(null)]);
    setStep(0);
    setAiMoves(0);
    setMoveEvals({});
    setHintMove(null);
    setWinningLine([]);
    setSelected(0);
  };

  const moveUp = () => setSelected((s) => (s - size + size * size) % (size * size));
  const moveDown = () => setSelected((s) => (s + size) % (size * size));
  const moveLeft = () =>
    setSelected((s) => (s % size === 0 ? s + size - 1 : s - 1));
  const moveRight = () =>
    setSelected((s) => ((s + 1) % size === 0 ? s - size + 1 : s + 1));

  const exportReplay = () => {
    const data = JSON.stringify({ size, history });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tictactoe-replay.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (player === null) return;
      if (e.key === 'ArrowUp') moveUp();
      else if (e.key === 'ArrowDown') moveDown();
      else if (e.key === 'ArrowLeft') moveLeft();
      else if (e.key === 'ArrowRight') moveRight();
      else if (e.key === 'Enter' || e.key === ' ') handleClick(selected);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [player, selected, size]);

  const difficultySlider = (
    <div className="w-40 mb-4">
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={difficulty}
        onChange={(e) => setDifficulty(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs">
        <span>Easy</span>
        <span>Hard</span>
      </div>
    </div>
  );

  if (player === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4">
        {difficultySlider}
        <div className="mb-4 flex flex-col items-center">
          <label className="mb-1">Board Size</label>
          <select
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="bg-gray-700 p-1 rounded"
          >
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
          </select>
        </div>
        <div className="mb-4">Choose X or O</div>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('X')}
          >
            X
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('O')}
          >
            O
          </button>
        </div>
        <div className="mt-4 text-sm text-center">
          <div>
            Wins: {stats.wins} Losses: {stats.losses} Draws: {stats.draws}
          </div>
          <div>Streak: {stats.streak}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row items-center justify-center bg-panel text-white p-4 space-y-4 md:space-y-0 md:space-x-4">
      <div className="flex flex-col items-center">
        {difficultySlider}
        <div
          className={`grid gap-1 ${size === 3 ? 'w-60' : 'w-80'} mb-2`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {board.map((cell, idx) => (
            <button
              key={idx}
              className={`relative h-20 w-20 text-4xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 ${
                winningLine.includes(idx) ? 'bg-green-600 animate-pulse' : ''
              } ${selected === idx ? 'ring-2 ring-yellow-400' : ''}`}
              onClick={() => handleClick(idx)}
            >
              {cell || (
                <span className="text-xs text-gray-400">
                  {moveEvals[idx]?.toFixed(2)}
                </span>
              )}
              {hintMove === idx && !cell && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-green-400">↑</span>
              )}
            </button>
          ))}
        </div>
        <div className="mb-2">{status}</div>
        <div className="hidden md:block text-xs mb-2">Use arrow keys + Enter</div>
        <div className="md:hidden flex flex-col items-center mb-2">
          <div>
            <button className="px-2 py-1 bg-gray-700" onClick={moveUp}>
              ↑
            </button>
          </div>
          <div className="flex space-x-2 mt-2">
            <button className="px-2 py-1 bg-gray-700" onClick={moveLeft}>
              ←
            </button>
            <button className="px-2 py-1 bg-gray-700" onClick={() => handleClick(selected)}>
              OK
            </button>
            <button className="px-2 py-1 bg-gray-700" onClick={moveRight}>
              →
            </button>
          </div>
          <div className="mt-2">
            <button className="px-2 py-1 bg-gray-700" onClick={moveDown}>
              ↓
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={exportReplay}
          >
            Export
          </button>
        </div>
      </div>
      <div className="text-sm">
        <div className="mb-2 font-bold">Move history</div>
        <ol className="space-y-1 max-h-60 overflow-y-auto">
          {history.map((_, move) => (
            <li key={move}>
              <button
                className="underline text-blue-300"
                onClick={() => jumpTo(move)}
              >
                {move ? `Go to move #${move}` : 'Go to game start'}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <div className="font-bold mb-1">Leaderboard</div>
          <div>X wins: {leaderboard.X}</div>
          <div>O wins: {leaderboard.O}</div>
          <div>Draws: {leaderboard.draw}</div>
        </div>
        <div className="mt-4">
          <div className="font-bold mb-1">Your Stats</div>
          <div>Wins: {stats.wins}</div>
          <div>Losses: {stats.losses}</div>
          <div>Draws: {stats.draws}</div>
          <div>Streak: {stats.streak}</div>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;

