'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pointerHandlers } from '../../utils/pointer';
import usePersistentState from '../../hooks/usePersistentState';
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
import './checkers.css';

// Helper to get all moves without enforcing capture
const getAllMovesNoForce = (board: Board, color: 'red' | 'black'): Move[] => {
  let result: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        const moves = getPieceMoves(board, r, c, false);
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
  const [rule, setRule] = usePersistentState<'forced' | 'relaxed'>('checkersRule', 'forced');
  const [algorithm, setAlgorithm] = useState<'alphabeta' | 'mcts'>('alphabeta');
  const [difficulty, setDifficulty] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [noCapture, setNoCapture] = useState(0);
  const [history, setHistory] = useState<
    { board: Board; turn: 'red' | 'black'; noCapture: number }[]
  >([]);
  const workerRef = useRef<Worker | null>(null);
  const moveRef = useRef(false);
  const positionCounts = useRef<Map<string, number>>(new Map());
  const [crowned, setCrowned] = useState<[number, number] | null>(null);

  const makeMove = useCallback(
    (move: Move) => {
      if (!moveRef.current) {
        setHistory((h) => [...h, { board, turn, noCapture }]);
        moveRef.current = true;
      }
      const { board: newBoard, capture, king } = applyMove(board, move);
      const further = capture
        ? getPieceMoves(newBoard, move.to[0], move.to[1]).filter((m) => m.captured)
        : [];
      setBoard(newBoard);
      if (king) {
        setCrowned([move.to[0], move.to[1]]);
      }
      if (capture && further.length) {
        setSelected([move.to[0], move.to[1]]);
        setMoves(further);
        setNoCapture(0);
        return;
      }
      moveRef.current = false;
      const next = turn === 'red' ? 'black' : 'red';
      const newNo = capture || king ? 0 : noCapture + 1;
      setNoCapture(newNo);
      const key = JSON.stringify(newBoard);
      const count = positionCounts.current.get(key) || 0;
      positionCounts.current.set(key, count + 1);
      if (isDraw(newNo, positionCounts.current)) {
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
            difficulty,
            algorithm,
            enforceCapture: rule === 'forced',
          });
        }
      }
      setSelected(null);
      setMoves([]);
    },
    [board, turn, noCapture, rule, difficulty, algorithm],
  );

  useEffect(() => {
    workerRef.current = new Worker('/checkers-worker.js');
    workerRef.current.onmessage = (e: MessageEvent<Move>) => {
      const move = e.data;
      if (move) makeMove(move);
    };
    return () => workerRef.current?.terminate();
  }, [makeMove]);

  useEffect(() => {
    positionCounts.current.set(JSON.stringify(board), 1);
  }, []);

  const allMoves = useMemo(
    () =>
      rule === 'forced'
        ? getForcedMoves(board, turn)
        : getAllMovesNoForce(board, turn),
    [board, turn, rule],
  );

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || !piece || piece.color !== turn) return;
    const pieceMoves = getPieceMoves(board, r, c, rule === 'forced');
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

  const reset = () => {
    const initial = createBoard();
    setBoard(initial);
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setNoCapture(0);
    setHistory([]);
    moveRef.current = false;
    positionCounts.current = new Map([[JSON.stringify(initial), 1]]);
    setCrowned(null);
  };

  const undo = () => {
    if (!history.length) return;
    const currentKey = JSON.stringify(board);
    const count = positionCounts.current.get(currentKey) || 0;
    if (count <= 1) positionCounts.current.delete(currentKey);
    else positionCounts.current.set(currentKey, count - 1);
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setTurn(prev.turn);
    setNoCapture(prev.noCapture);
    setHistory(history.slice(0, -1));
    setWinner(null);
    setSelected(null);
    setMoves([]);
    setCrowned(null);
    if (prev.turn === 'black') {
      workerRef.current?.postMessage({
        board: prev.board,
        color: 'black',
        difficulty,
        algorithm,
        enforceCapture: rule === 'forced',
      });
    }
  };

  useEffect(() => {
    if (crowned) {
      const id = setTimeout(() => setCrowned(null), 600);
      return () => clearTimeout(id);
    }
  }, [crowned]);

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
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={undo}
          disabled={!history.length}
        >
          Undo
        </button>
      </div>
      <div className="w-full max-w-lg aspect-square">
        <div className="grid grid-cols-8 w-full h-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
              const isSelected = selected && selected[0] === r && selected[1] === c;
              const isCrowned = crowned && crowned[0] === r && crowned[1] === c;
              return (
                <div
                  key={`${r}-${c}`}
                  {...pointerHandlers(() => (selected ? tryMove(r, c) : selectPiece(r, c)))}
                  className={`aspect-square flex items-center justify-center ${
                    isDark ? 'bg-gray-700' : 'bg-gray-400'
                  } ${isMove ? 'move-square' : ''} ${isSelected ? 'selected-square' : ''}`}
                >
                  {cell && (
                    <div
                      className={`w-3/4 h-3/4 rounded-full flex items-center justify-center ${
                        cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                      } ${cell.king ? 'border-4 border-yellow-300' : ''} ${
                        isCrowned ? 'motion-safe:animate-flourish' : ''
                      }`}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
