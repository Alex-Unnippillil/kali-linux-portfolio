import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  isDraw,
  hasMoves,
  Move,
  Board,
} from './engine';

const Checkers = () => {
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [history, setHistory] = useState<{ board: Board; turn: string; no: number }[]>([]);
  const [future, setFuture] = useState<{ board: Board; turn: string; no: number }[]>([]);
  const [noCapture, setNoCapture] = useState(0);
  const [hint, setHint] = useState<Move | null>(null);
  const [lastMove, setLastMove] = useState<[number, number][]>([]);
    const workerRef = useRef<Worker | null>(null);
    const hintRequest = useRef(false);
    const pathRef = useRef<[number, number][]>([]);
    const makeMoveRef = useRef<((move: Move) => void) | null>(null);

  useEffect(() => {
    workerRef.current = new Worker('/checkers-worker.js');
    workerRef.current.onmessage = (e: MessageEvent<Move>) => {
      const move = e.data;
      if (hintRequest.current) {
        setHint(move);
        hintRequest.current = false;
        } else if (move) {
          makeMoveRef.current?.(move);
        }
      };
      return () => workerRef.current?.terminate();
    }, []);

  const allMoves = useMemo(() => getAllMoves(board, turn), [board, turn]);

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || draw || !piece || piece.color !== turn) return;
    const pieceMoves = getPieceMoves(board, r, c);
    const mustCapture = allMoves.some((m) => m.captured);
    const filtered = mustCapture ? pieceMoves.filter((m) => m.captured) : pieceMoves;
    if (filtered.length) {
      setSelected([r, c]);
      setMoves(filtered);
    }
  };

  const tryMove = (r: number, c: number) => {
    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (!move) return;
    makeMove(move);
  };

    const makeMove = (move: Move) => {
    if (pathRef.current.length === 0) pathRef.current = [move.from, move.to];
    else pathRef.current.push(move.to);
    const { board: newBoard, capture, king } = applyMove(board, move);
    const further = capture
      ? getPieceMoves(newBoard, move.to[0], move.to[1]).filter((m) => m.captured)
      : [];
    setBoard(newBoard);
    if (capture && further.length) {
      setSelected([move.to[0], move.to[1]]);
      setMoves(further);
      setNoCapture(0);
      return;
    }
    const newHistory = [...history, { board, turn, no: noCapture }];
    setHistory(newHistory);
    setFuture([]);
    const next = turn === 'red' ? 'black' : 'red';
    const newNo = capture || king ? 0 : noCapture + 1;
    setNoCapture(newNo);
    ReactGA.event({
      category: 'Checkers',
      action: 'move',
      label: turn === 'red' ? 'player' : 'ai',
    });
    if (capture) {
      ReactGA.event({
        category: 'Checkers',
        action: 'capture',
        label: turn === 'red' ? 'player' : 'ai',
      });
    }
    if (isDraw(newNo)) {
      setDraw(true);
      ReactGA.event({ category: 'Checkers', action: 'game_over', label: 'draw' });
      setLastMove(pathRef.current);
      pathRef.current = [];
      return;
    }
    if (!hasMoves(newBoard, next)) {
      setWinner(turn);
      ReactGA.event({ category: 'Checkers', action: 'game_over', label: turn });
    } else {
      setTurn(next);
      if (next === 'black') {
        workerRef.current?.postMessage({ board: newBoard, color: 'black', maxDepth: 8 });
      }
    }
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove(pathRef.current);
    pathRef.current = [];
    };

    makeMoveRef.current = makeMove;

  const reset = () => {
    setBoard(createBoard());
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setFuture([]);
    setNoCapture(0);
    setHint(null);
    setLastMove([]);
    pathRef.current = [];
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture([{ board, turn, no: noCapture }, ...future]);
    setBoard(prev.board);
    setTurn(prev.turn as 'red' | 'black');
    setNoCapture(prev.no);
    setHistory(history.slice(0, -1));
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    pathRef.current = [];
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory([...history, { board, turn, no: noCapture }]);
    setBoard(next.board);
    setTurn(next.turn as 'red' | 'black');
    setNoCapture(next.no);
    setFuture(future.slice(1));
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    pathRef.current = [];
    if (next.turn === 'black') {
      workerRef.current?.postMessage({ board: next.board, color: 'black', maxDepth: 8 });
    }
  };

  const hintMove = () => {
    hintRequest.current = true;
    workerRef.current?.postMessage({ board, color: turn, maxDepth: 8 });
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      {draw && <div className="mb-2 text-xl">Draw!</div>}
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isHint = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isLast = lastMove.some((p) => p[0] === r && p[1] === c);
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => (selected ? tryMove(r, c) : selectPiece(r, c))}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${isMove ? 'ring-2 ring-yellow-300' : ''} ${
                  isHint || isHintDest ? 'ring-2 ring-blue-400' : ''
                } ${isSelected ? 'ring-2 ring-green-400' : ''} ${
                  isLast ? 'ring-2 ring-red-400' : ''
                }`}
              >
                {cell && (
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''}`}
                  >
                    {cell.king && (
                      <span className="text-yellow-300 text-sm font-bold">K</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 space-x-2">
        {winner || draw ? (
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={reset}
          >
            Reset
          </button>
        ) : (
          <>
            <span className="mr-2">Turn: {turn}</span>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={undo}
            >
              Undo
            </button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={redo}
            >
              Redo
            </button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={hintMove}
            >
              Hint
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkers;
