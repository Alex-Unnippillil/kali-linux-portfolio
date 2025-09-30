'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pointerHandlers } from '../../utils/pointer';
import usePersistentState from '../../hooks/usePersistentState';
import {
  Board,
  Move,
  createBoard,
  getPieceMoves,
  applyMove,
  hasMoves,
  isDraw,
} from '../../components/apps/checkers/engine';
import { getSelectableMoves } from '../../games/checkers/logic';
import './checkers.css';

type MoveLogEntry = { player: 'red' | 'black'; notation: string };

const squareNotation = ([r, c]: [number, number]) =>
  `${String.fromCharCode(97 + c)}${8 - r}`;

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
  const [hint, setHint] = useState<Move | null>(null);
  const hintRequest = useRef(false);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const movePathRef = useRef<[number, number][]>([]);
  const captureSequenceRef = useRef(false);

  const makeMove = useCallback(
    (move: Move) => {
      const actingPlayer = turn;
      if (!moveRef.current) {
        setHistory((h) => [...h, { board, turn, noCapture }]);
        moveRef.current = true;
        movePathRef.current = [move.from];
        captureSequenceRef.current = false;
      }
      if (!movePathRef.current.length) {
        movePathRef.current = [move.from];
      }
      movePathRef.current.push(move.to);
      if (move.captured) captureSequenceRef.current = true;
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
      setHint(null);
      if (movePathRef.current.length >= 2) {
        const notation = movePathRef.current
          .map(squareNotation)
          .join(captureSequenceRef.current ? 'x' : '-');
        setMoveLog((prev) => [...prev, { player: actingPlayer, notation }]);
      }
      movePathRef.current = [];
      captureSequenceRef.current = false;
    },
    [board, turn, noCapture, rule, difficulty, algorithm, setMoveLog],
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker('/checkers-worker.js');
      workerRef.current.onmessage = (e: MessageEvent<Move>) => {
        const move = e.data;
        if (!move) return;
        if (hintRequest.current) {
          setHint(move);
          hintRequest.current = false;
          setTimeout(() => setHint(null), 1000);
        } else {
          makeMove(move);
        }
      };
      return () => workerRef.current?.terminate();
    }
    return undefined;
  }, [makeMove]);

  useEffect(() => {
    positionCounts.current.set(JSON.stringify(board), 1);
  }, [board]);

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || !piece || piece.color !== turn) return;
    const filtered = getSelectableMoves(board, r, c, rule === 'forced');
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
    setHint(null);
    hintRequest.current = false;
    setMoveLog([]);
    movePathRef.current = [];
    captureSequenceRef.current = false;
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
    setMoveLog((entries) => entries.slice(0, -1));
    moveRef.current = false;
    movePathRef.current = [];
    captureSequenceRef.current = false;
  };

  useEffect(() => {
    if (crowned) {
      const id = setTimeout(() => setCrowned(null), 600);
      return () => clearTimeout(id);
    }
  }, [crowned]);

  const hintMove = () => {
    if (winner) return;
    hintRequest.current = true;
    workerRef.current?.postMessage({
      board,
      color: turn,
      difficulty,
      algorithm,
      enforceCapture: rule === 'forced',
    });
  };

  type LayoutCSSVariables = {
    '--panel-height': string;
    '--board-size': string;
  };

  const layoutStyle = useMemo<React.CSSProperties & LayoutCSSVariables>(
    () => ({
      '--panel-height': '10rem',
      '--board-size': 'clamp(10rem, min(90vw, calc(100vh - var(--panel-height))), 36rem)',
    }),
    [],
  );

  const PanelContent = ({ variant }: { variant: 'mobile' | 'desktop' }) => (
    <div className={`flex flex-col gap-2 ${variant === 'mobile' ? 'h-full' : ''} text-xs`}> 
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-wide text-[0.65rem] text-gray-300">Rules</span>
          <select
            className="rounded bg-gray-800 px-2 py-1 text-sm"
            value={rule}
            onChange={(e) => setRule(e.target.value as 'forced' | 'relaxed')}
          >
            <option value="forced">Forced Capture</option>
            <option value="relaxed">Capture Optional</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-wide text-[0.65rem] text-gray-300">AI</span>
          <select
            className="rounded bg-gray-800 px-2 py-1 text-sm"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'alphabeta' | 'mcts')}
          >
            <option value="alphabeta">Alpha-Beta</option>
            <option value="mcts">MCTS</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <span className="uppercase tracking-wide text-[0.65rem] text-gray-300">Difficulty</span>
        <input
          type="range"
          min={1}
          max={8}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          aria-label="Difficulty"
          className="h-2 flex-1 accent-amber-400"
        />
        <span className="tabular-nums text-sm text-gray-200">{difficulty}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm transition hover:bg-gray-600"
          onClick={reset}
        >
          Reset
        </button>
        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={undo}
          disabled={!history.length}
        >
          Undo
        </button>
        <button
          className="rounded bg-gray-700 px-3 py-1 text-sm transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={hintMove}
          disabled={!!winner}
        >
          Hint
        </button>
      </div>
      <div
        className={`rounded-md bg-black/30 p-2 ${
          variant === 'mobile' ? 'flex-1 overflow-y-auto' : 'max-h-[28rem] overflow-y-auto'
        }`}
      >
        <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-gray-300">
          <span>Moves</span>
          <span className="capitalize text-gray-200">
            {winner ? (winner === 'Draw' ? 'Draw' : `${winner} wins`) : `Turn: ${turn}`}
          </span>
        </div>
        {moveLog.length ? (
          <ol className="mt-2 space-y-1 text-sm">
            {moveLog.map((entry, idx) => {
              const moveNumber = Math.floor(idx / 2) + 1;
              const prefix = idx % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
              return (
                <li
                  key={`${entry.notation}-${idx}`}
                  className="grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded bg-white/5 px-2 py-1"
                >
                  <span className="font-mono text-xs text-gray-300">{prefix}</span>
                  <span
                    className={`text-xs font-semibold capitalize ${
                      entry.player === 'red' ? 'text-red-300' : 'text-gray-200'
                    }`}
                  >
                    {entry.player}
                  </span>
                  <span className="font-mono text-sm text-white">{entry.notation}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-gray-400">No moves yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="relative flex h-full w-full flex-col bg-ub-cool-grey text-white md:flex-row"
      style={layoutStyle}
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pt-6 md:py-8"
        style={{ paddingBottom: 'var(--panel-height)' }}
      >
        {winner && (
          <div className="text-xl">
            {winner === 'Draw' ? 'Draw!' : `${winner} wins!`}
          </div>
        )}
        {!winner && (
          <div className="text-sm uppercase tracking-wide text-gray-300">Turn: {turn}</div>
        )}
        <div className="w-[var(--board-size)] max-w-full">
          <div className="grid h-[var(--board-size)] w-full grid-cols-8 rounded-lg shadow-lg shadow-black/30">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
                const isSelected = selected && selected[0] === r && selected[1] === c;
                const isCrowned = crowned && crowned[0] === r && crowned[1] === c;
                const isHint = hint && hint.from[0] === r && hint.from[1] === c;
                const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    {...pointerHandlers(() => (selected ? tryMove(r, c) : selectPiece(r, c)))}
                    className={`aspect-square flex items-center justify-center transition ${
                      isDark ? 'bg-gray-700' : 'bg-gray-400'
                    } ${isMove ? 'move-square' : ''} ${isSelected ? 'selected-square' : ''} ${
                      isHint || isHintDest ? 'hint-square' : ''
                    }`}
                  >
                    {cell && (
                      <div
                        className={`flex h-3/4 w-3/4 items-center justify-center rounded-full ${
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
      <aside className="hidden w-72 shrink-0 flex-col gap-3 p-4 md:flex">
        <PanelContent variant="desktop" />
      </aside>
      <div className="md:hidden">
        <div className="sticky bottom-0 left-0 right-0 border-t border-white/10 bg-ub-grey/95 backdrop-blur">
          <div className="px-4 py-3" style={{ height: 'var(--panel-height)' }}>
            <PanelContent variant="mobile" />
          </div>
        </div>
      </div>
    </div>
  );
}
