import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pointerHandlers } from '../../utils/pointer';
import {
  Board,
  Move,
  createBoard,
  getPieceMoves,
  getAllMoves as getForcedMoves,
  applyMove,
  hasMoves,
  isDraw,
} from '../../components/apps/checkers/engine';

// Helper to get all moves without enforcing capture
const getAllMovesNoForce = (board: Board, color: 'red' | 'black'): Move[] => {
  let result: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  return result;
};

export default function CheckersPage() {
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [rule, setRule] = useState<'forced' | 'relaxed'>('forced');
  const [algorithm, setAlgorithm] = useState<'alphabeta' | 'mcts'>('alphabeta');
  const [difficulty, setDifficulty] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [noCapture, setNoCapture] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/checkersAI.ts', import.meta.url));
    workerRef.current.onmessage = (e: MessageEvent<Move | null>) => {
      const move = e.data;
      if (move) makeMove(move);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const allMoves = useMemo(
    () =>
      rule === 'forced'
        ? getForcedMoves(board, turn)
        : getAllMovesNoForce(board, turn),
    [board, turn, rule]
  );

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || !piece || piece.color !== turn) return;
    const pieceMoves = getPieceMoves(board, r, c);
    const mustCapture = rule === 'forced' && allMoves.some((m) => m.captured);
    const filtered = mustCapture ? pieceMoves.filter((m) => m.captured) : pieceMoves;
    if (filtered.length) {
      setSelected([r, c]);
      setMoves(filtered);
    }
  };

  const tryMove = (r: number, c: number) => {
    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) makeMove(move);
  };

  const makeMove = (move: Move, b: Board = board) => {
    const { board: newBoard, capture } = applyMove(b, move);
    const further = capture ? move.next || [] : [];
    setBoard(newBoard);
    if (capture && further.length) {
      setNoCapture(0);
      if (turn === 'black') {
        setTimeout(() => makeMove(further[0], newBoard), 0);
      } else {
        setSelected([move.to[0], move.to[1]]);
        setMoves(further);
      }
      return;
    }
    const next = turn === 'red' ? 'black' : 'red';
    const newNo = capture ? 0 : noCapture + 1;
    setNoCapture(newNo);
    if (isDraw(newNo)) {
      setWinner('Draw');
    } else {
      const hasNext =
        rule === 'forced'
          ? hasMoves(newBoard, next)
          : getAllMovesNoForce(newBoard, next).length > 0;
      if (!hasNext) {
        setWinner(turn);
        return;
      }
      setTurn(next);
      if (next === 'black') {
        workerRef.current?.postMessage({
          board: newBoard,
          color: 'black',
          maxDepth: difficulty,
          enforceCapture: rule === 'forced',
        });
      }
    }
    setSelected(null);
    setMoves([]);
  };

  const reset = () => {
    setBoard(createBoard());
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setNoCapture(0);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-ub-cool-grey text-white p-4">
      {winner && <div className="mb-2 text-xl">{winner === 'Draw' ? 'Draw!' : `${winner} wins!`}</div>}
      <div className="mb-4 flex gap-4 items-center">
        <label>
          Rules:
          <select
            className="ml-2 bg-gray-700 px-1"
            value={rule}
            onChange={(e) => setRule(e.target.value as any)}
          >
            <option value="forced">Forced Capture</option>
            <option value="relaxed">Capture Optional</option>
          </select>
        </label>
        <label>
          AI:
          <select
            className="ml-2 bg-gray-700 px-1"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as any)}
          >
            <option value="alphabeta">Alpha-Beta</option>
            <option value="mcts">MCTS</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Difficulty {difficulty}
          <input
            type="range"
            min={1}
            max={8}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
        </label>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isSelected = selected && selected[0] === r && selected[1] === c;
            return (
              <div
                key={`${r}-${c}`}
                {...pointerHandlers(() =>
                  selected ? tryMove(r, c) : selectPiece(r, c)
                )}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${isMove ? 'ring-2 ring-yellow-300 animate-pulse' : ''} ${
                  isSelected ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {cell && (
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''}`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
