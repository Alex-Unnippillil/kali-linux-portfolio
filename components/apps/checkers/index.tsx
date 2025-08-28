import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import { pointerHandlers } from '../../../utils/pointer';
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
  const [history, setHistory] = useState<
    { board: Board; turn: string; no: number; move: [number, number][] }[]
  >([]);
  const [future, setFuture] = useState<
    { board: Board; turn: string; no: number; move: [number, number][] }[]
  >([]);
  const [noCapture, setNoCapture] = useState(0);
  const [hint, setHint] = useState<Move | null>(null);
  const [lastMove, setLastMove] = useState<[number, number][]>([]);
  const [crowned, setCrowned] = useState<[number, number] | null>(null);
  const [ariaMessage, setAriaMessage] = useState('');
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [showLegal, setShowLegal] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const workerRef = useRef<Worker | null>(null);
  const hintRequest = useRef(false);
  const pathRef = useRef<[number, number][]>([]);
  const makeMoveRef = useRef<((move: Move) => void) | null>(null);
  const crownFrame = useRef<number>(0);

  useEffect(() => {
    workerRef.current = new Worker('/checkers-worker.js');
    workerRef.current.onmessage = (e: MessageEvent<Move>) => {
      const move = e.data;
      if (hintRequest.current) {
        setHint(move);
        hintRequest.current = false;
        setTimeout(() => setHint(null), 1000);
      } else if (move) {
        makeMoveRef.current?.(move);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('checkersState');
    if (saved) {
      const state = JSON.parse(saved);
      setBoard(state.board);
      setTurn(state.turn);
      setHistory((state.history || []).map((h: any) => ({
        board: h.board,
        turn: h.turn,
        no: h.no,
        move: h.move || [],
      })));
      setFuture((state.future || []).map((f: any) => ({
        board: f.board,
        turn: f.turn,
        no: f.no,
        move: f.move || [],
      })));
      setNoCapture(state.noCapture || 0);
      setWinner(state.winner);
      setDraw(state.draw);
      setLastMove(state.lastMove || []);
      if (state.turn === 'black') {
        setTimeout(() =>
          workerRef.current?.postMessage({
            board: state.board,
            color: 'black',
            maxDepth: 8,
          }), 0);
      }
    }
  }, []);

  useEffect(() => {
    const state = {
      board,
      turn,
      history,
      future,
      noCapture,
      winner,
      draw,
      lastMove,
    };
    localStorage.setItem('checkersState', JSON.stringify(state));
  }, [board, turn, history, future, noCapture, winner, draw, lastMove]);

  const allMoves = useMemo(() => getAllMoves(board, turn), [board, turn]);

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || draw || !piece || piece.color !== turn) return;
    setCursor([r, c]);
    const pieceMoves = getPieceMoves(board, r, c);
    const mustCapture = allMoves.some((m) => m.captured);
    const filtered = mustCapture ? pieceMoves.filter((m) => m.captured) : pieceMoves;
    if (filtered.length) {
      setSelected([r, c]);
      setMoves(filtered);
      setAriaMessage(`${filtered.length} legal move${filtered.length > 1 ? 's' : ''} available`);
    }
    focusBoard();
  };

  const tryMove = (r: number, c: number) => {
    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (!move) return;
    makeMove(move);
    setCursor([r, c]);
    focusBoard();
  };

    const makeMove = (move: Move) => {
    if (pathRef.current.length === 0) pathRef.current = [move.from, move.to];
    else pathRef.current.push(move.to);
    const { board: newBoard, capture, king } = applyMove(board, move);
    const further = capture
      ? getPieceMoves(newBoard, move.to[0], move.to[1]).filter((m) => m.captured)
      : [];
    setBoard(newBoard);
    if (king) {
      setCrowned([move.to[0], move.to[1]]);
      setAriaMessage(`Piece crowned at row ${move.to[0] + 1}, column ${move.to[1] + 1}`);
      if (crownFrame.current) cancelAnimationFrame(crownFrame.current);
      const start = performance.now();
      const step = (now: number) => {
        if (now - start > 1000) {
          setCrowned(null);
        } else {
          crownFrame.current = requestAnimationFrame(step);
        }
      };
      crownFrame.current = requestAnimationFrame(step);
    }
    if (capture && further.length) {
      setSelected([move.to[0], move.to[1]]);
      setMoves(further);
      setNoCapture(0);
      return;
    }
    const newHistory = [
      ...history,
      { board, turn, no: noCapture, move: pathRef.current },
    ];
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
    setAriaMessage('');
    pathRef.current = [];
    focusBoard();
    };

    makeMoveRef.current = makeMove;

  const reset = () => {
    if (crownFrame.current) cancelAnimationFrame(crownFrame.current);
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
    setCrowned(null);
    setAriaMessage('');
    pathRef.current = [];
    setCursor([0, 0]);
    localStorage.removeItem('checkersState');
    focusBoard();
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture([{ board, turn, no: noCapture, move: lastMove }, ...future]);
    setBoard(prev.board);
    setTurn(prev.turn as 'red' | 'black');
    setNoCapture(prev.no);
    setHistory(history.slice(0, -1));
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove(prev.move || []);
    if (crownFrame.current) cancelAnimationFrame(crownFrame.current);
    setAriaMessage('');
    pathRef.current = [];
    focusBoard();
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory([...history, { board, turn, no: noCapture, move: lastMove }]);
    setBoard(next.board);
    setTurn(next.turn as 'red' | 'black');
    setNoCapture(next.no);
    setFuture(future.slice(1));
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove(next.move || []);
    if (crownFrame.current) cancelAnimationFrame(crownFrame.current);
    setAriaMessage('');
    pathRef.current = [];
    if (next.turn === 'black') {
      workerRef.current?.postMessage({ board: next.board, color: 'black', maxDepth: 8 });
    }
    focusBoard();
  };

  const hintMove = () => {
    hintRequest.current = true;
    workerRef.current?.postMessage({ board, color: turn, maxDepth: 8 });
    focusBoard();
  };

  const toggleShowLegal = () => {
    setShowLegal((s) => !s);
    setAriaMessage(showLegal ? 'Hiding legal moves' : 'Showing legal moves');
    focusBoard();
  };

  const focusBoard = () => boardRef.current?.focus();

  useEffect(() => {
    focusBoard();
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let [r, c] = cursor;
    if (e.key === 'ArrowUp') {
      r = Math.max(0, r - 1);
    } else if (e.key === 'ArrowDown') {
      r = Math.min(7, r + 1);
    } else if (e.key === 'ArrowLeft') {
      c = Math.max(0, c - 1);
    } else if (e.key === 'ArrowRight') {
      c = Math.min(7, c + 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selected ? tryMove(r, c) : selectPiece(r, c);
      return;
    } else if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    } else if (e.key.toLowerCase() === 'h') {
      e.preventDefault();
      hintMove();
      return;
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleShowLegal();
      return;
    }
    if (r !== cursor[0] || c !== cursor[1]) {
      e.preventDefault();
      setCursor([r, c]);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      {draw && <div className="mb-2 text-xl">Draw!</div>}
      <div
        ref={boardRef}
        tabIndex={0}
        onKeyDown={handleKey}
        aria-label="Checkers board"
        className="grid grid-cols-8 gap-0 outline-none"
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isHint = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isLast = lastMove.some((p) => p[0] === r && p[1] === c);
            const isCrowned = crowned && crowned[0] === r && crowned[1] === c;
            const isCursor = cursor[0] === r && cursor[1] === c;
            const showMove = showLegal && isMove;
            return (
              <div
                key={`${r}-${c}`}
                {...pointerHandlers(() =>
                  selected ? tryMove(r, c) : selectPiece(r, c)
                )}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${
                  showMove
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black drop-shadow-[0_0_8px_#fbbf24] motion-safe:animate-glow'
                    : ''
                } ${
                  isHint || isHintDest
                    ? 'ring-2 ring-blue-400 motion-safe:animate-pulse'
                    : ''
                } ${isSelected ? 'ring-2 ring-green-400' : ''} ${
                  isLast ? 'ring-2 ring-red-400' : ''
                } ${isCursor ? 'ring-2 ring-yellow-300' : ''}`}
              >
                {cell && (
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''} ${
                      isCrowned ? 'motion-safe:animate-flourish' : ''
                    }`}
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
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={toggleShowLegal}
              aria-pressed={showLegal}
            >
              {showLegal ? 'Hide Moves' : 'Show Moves'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkers;
