import React, { useMemo, useState } from 'react';
import {
  checkWinner,
  createBoard,
  Player,
  applyMove,
  getLegalMoves,
  chooseAiMove,
} from '../../../apps/games/tictactoe/logic';

type Step = {
  board: (Player | null)[];
  explanation: string;
};

const describeMove = (board: (Player | null)[], player: Player, move: number): string => {
  const opponent: Player = player === 'X' ? 'O' : 'X';
  const newBoard = applyMove(board, move, player);
  const result = checkWinner(newBoard, 3);
  if (result.winner && result.winner !== 'draw') {
    return `${player} wins by completing a line.`;
  }
  const opponentWinningMove = getLegalMoves(board).find(
    (idx) => checkWinner(applyMove(board, idx, opponent), 3).winner === opponent,
  );
  const stillHasThreat = getLegalMoves(newBoard).some(
    (idx) => checkWinner(applyMove(newBoard, idx, opponent), 3).winner === opponent,
  );
  if (opponentWinningMove !== undefined && !stillHasThreat) {
    return `${player} blocks ${opponent}'s winning threat.`;
  }
  if (move === 4) return `${player} takes center to control the board.`;
  const corners = [0, 2, 6, 8];
  if (corners.includes(move)) return `${player} takes a corner to stay aggressive.`;
  return `${player} plays an edge to improve their position.`;
};

const buildSteps = (): Step[] => {
  const steps: Step[] = [];
  const board = createBoard(3);
  let current: Player = 'X';

  while (true) {
    const move = chooseAiMove(board.slice(), current, {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    if (move < 0) break;
    board[move] = current;
    const result = checkWinner(board, 3);
    const explanation = result.winner
      ? result.winner === 'draw'
        ? 'With perfect play the game ends in a draw.'
        : `${current} wins by completing a line.`
      : describeMove(board.slice(), current, move);
    steps.push({ board: board.slice(), explanation });
    if (result.winner) break;
    current = current === 'X' ? 'O' : 'X';
  }

  return steps;
};

const Tutorial = () => {
  const steps = useMemo(buildSteps, []);
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  return (
    <div className="p-4 text-white bg-ub-cool-grey">
      <div className="grid grid-cols-3 gap-2 w-48 mx-auto mb-4">
        {step.board.map((cell, i) => (
          <div
            key={i}
            className="w-16 h-16 flex items-center justify-center bg-gray-700 text-2xl"
          >
            {cell ?? ''}
          </div>
        ))}
      </div>
      <p className="mb-4 text-center">{step.explanation}</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setIdx(Math.max(idx - 1, 0))}
          disabled={idx === 0}
          className="px-4 py-2 bg-gray-700 disabled:opacity-50 rounded"
        >
          Prev
        </button>
        <button
          onClick={() => setIdx(Math.min(idx + 1, steps.length - 1))}
          disabled={idx === steps.length - 1}
          className="px-4 py-2 bg-gray-700 disabled:opacity-50 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Tutorial;
