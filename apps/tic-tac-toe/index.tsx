import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * All possible winning line combinations on the board. Each array contains the
 * indexes of squares that form a line. The board is represented as a flat array
 * of nine cells:
 *
 * [0,1,2,
 *  3,4,5,
 *  6,7,8]
 */
const winningLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Determine the winner of the current board.
 *
 * @param board - Current board state represented as an array of nine cells. Each
 * cell contains 'X', 'O', or `null`.
 * @returns Object containing the winning player ('X', 'O', or 'draw') and the
 * indices forming the winning line. If the game is not finished, `winner` is
 * `null`.
 */
export const checkWinner = (
  board: (string | null)[],
): { winner: string | null; line: number[] } => {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
};

/**
 * Recursive minimax implementation used by the AI to evaluate moves.
 *
 * The algorithm always scores the board from O's perspective:
 *   - `1`  : O wins
 *   - `-1` : X wins
 *   - `0`  : Draw
 *
 * @param board - Current board state.
 * @param player - The player whose turn it is at this depth.
 * @returns Best move index and the associated score.
 */
export const minimax = (
  board: (string | null)[],
  player: 'X' | 'O',
): { index?: number; score: number } => {
  const { winner } = checkWinner(board);
  if (winner === 'O') return { score: 1 };
  if (winner === 'X') return { score: -1 };
  if (winner === 'draw') return { score: 0 };

  const moves: { index: number; score: number }[] = [];
  board.forEach((cell, idx) => {
    if (!cell) {
      const newBoard = board.slice();
      newBoard[idx] = player;
      const result = minimax(newBoard, player === 'O' ? 'X' : 'O');
      moves.push({ index: idx, score: result.score });
    }
  });

  if (player === 'O') {
    // O tries to maximise the score
    return moves.reduce((best, move) => (move.score > best.score ? move : best), {
      score: -Infinity,
    });
  }
  // X tries to minimise the score
  return moves.reduce((best, move) => (move.score < best.score ? move : best), {
    score: Infinity,
  });
};

const TicTacToe: React.FC = () => {
  // Game state
  const [history, setHistory] = useState<(string | null)[][]>([Array(9).fill(null)]);
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
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ X: number; O: number; draw: number }>(
    { X: 0, O: 0, draw: 0 },
  );

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
    if (newBoard[idx] || checkWinner(newBoard).winner) return;
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
    setHistory([Array(9).fill(null)]);
    setStep(0);
    setAiMoves(0);
    setMoveEvals({});
    setWinningLine([]);
  };

  // Handle local board click
  const handleClick = (idx: number) => {
    if (player === null) return;
    if (board[idx] || checkWinner(board).winner) return;
    const filled = board.filter(Boolean).length;
    const isXTurn = filled % 2 === 0;
    const currentTurn = isXTurn ? 'X' : 'O';
    if (currentTurn !== player) return;
    applyMove(idx, player);
    sendMove(idx, player);
    setMoveEvals({});
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

  // React to board changes – AI moves and game over logic
  useEffect(() => {
    if (player === null || ai === null) return;
    const { winner, line } = checkWinner(board);
    if (winner) {
      if (winner !== 'draw') {
        setWinningLine(line);
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      }
      setStatus(
        winner === 'draw' ? "It's a draw" : winner === player ? 'You win!' : 'You lose!',
      );
      saveResult(winner);
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
        const result = minimax(newBoard, ai === 'X' ? 'O' : 'X');
        const score = ai === 'X' ? -result.score : result.score;
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
      setMoveEvals({});
      setStatus('Your turn');
    }
  }, [board, player, ai, difficulty]);

  // Jump to a specific move in history
  const jumpTo = (move: number) => {
    setHistory(history.slice(0, move + 1));
    setStep(move);
    setAiMoves(Math.floor(move / 2));
    setMoveEvals({});
    setWinningLine([]);
  };

  // Reset entire game
  const reset = () => {
    setPlayer(null);
    setAi(null);
    setStatus('Choose X or O');
    setHistory([Array(9).fill(null)]);
    setStep(0);
    setAiMoves(0);
    setMoveEvals({});
    setWinningLine([]);
  };

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
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row items-center justify-center bg-panel text-white p-4 space-y-4 md:space-y-0 md:space-x-4">
      <div className="flex flex-col items-center">
        {difficultySlider}
        <div className="grid grid-cols-3 gap-1 w-60 mb-4">
          {board.map((cell, idx) => (
            <button
              key={idx}
              className={`h-20 w-20 text-4xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 ${
                winningLine.includes(idx) ? 'bg-green-600 animate-pulse' : ''
              }`}
              onClick={() => handleClick(idx)}
            >
              {cell || (
                <span className="text-xs text-gray-400">
                  {moveEvals[idx]?.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mb-4">{status}</div>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
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
      </div>
    </div>
  );
};

export default TicTacToe;

