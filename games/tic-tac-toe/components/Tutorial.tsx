import React, { useMemo, useState } from 'react';
import { minimax, checkWinner, createBoard, type Player } from '../../../apps/games/tictactoe/logic';

type Step = {
  board: (Player | null)[];
  explanation: string;
};

const getMoveExplanation = (player: Player, index: number): string => {
  if (index === 4) {
    return `${player} takes the center, the strongest opening move.`;
  }
  const corners = [0, 2, 6, 8];
  if (corners.includes(index)) {
    return `${player} chooses a corner to stay offensive and create forks.`;
  }
  return `${player} plays an edge to block the opponent.`;
};

const buildSteps = (): Step[] => {
  const steps: Step[] = [];
  const board = createBoard(3);
  let current: Player = 'X';

  while (true) {
    const move = minimax(board.slice(), current, 3).index;
    if (move < 0) break;
    board[move] = current;
    const result = checkWinner(board, 3);
    let explanation = getMoveExplanation(current, move);
    if (result.winner) {
      explanation =
        result.winner === 'draw'
          ? 'With perfect play the game ends in a draw.'
          : `${current} completes a line and wins.`;
      steps.push({ board: board.slice(), explanation });
      break;
    }
    steps.push({ board: board.slice(), explanation });
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
