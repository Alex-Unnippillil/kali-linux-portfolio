import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
// @ts-ignore - socket.io-client has no types in this project
import { io } from 'socket.io-client';
import {
  createBoard,
  getPieceMoves,
  getAllMoves,
  applyMove,
  isDraw,
  getWinner,
  createConfig,
  Variant,
  Move,
  Board,
  Config,
} from '../../../apps/checkers/engine';
import { saveMatch } from '@lib/checkers-history';

const Checkers = () => {
  const [variant, setVariant] = useState<Variant>('standard');
  const [depth, setDepth] = useState(4);
  const [timeLimit, setTimeLimit] = useState(200);
  const config = useMemo<Config>(() => createConfig(variant), [variant]);
  const [board, setBoard] = useState<Board>(() => createBoard(config));
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const socketRef = useRef<any>(null);
  const [gameId, setGameId] = useState('');
  const [spectate, setSpectate] = useState(false);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [history, setHistory] = useState<
    { board: Board; turn: string; no: number }[]
  >([]);
  const [future, setFuture] = useState<
    { board: Board; turn: string; no: number }[]
  >([]);
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

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.on(
      'state',
      (state: { board: Board; turn: 'red' | 'black' }) => {
        setBoard(state.board);
        setTurn(state.turn);
      }
    );
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (gameId) socketRef.current?.emit('join', { gameId, variant });
  }, [gameId, variant]);

  const allMoves = useMemo(
    () => getAllMoves(board, turn, config),
    [board, turn, config]
  );
  const legalFrom = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMoves) set.add(`${m.from[0]},${m.from[1]}`);
    return set;
  }, [allMoves]);

  useEffect(() => {
    setBoard(createBoard(config));
    setTurn('red');
    setHistory([]);
    setFuture([]);
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    pathRef.current = [];
  }, [config]);

  const selectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (winner || draw || spectate || !piece || piece.color !== turn) return;
    const pieceMoves = getPieceMoves(board, r, c, config);
    const mustCapture = allMoves.some((m) => m.captures?.length);
    const filtered = mustCapture
      ? pieceMoves.filter((m) => m.captures?.length)
      : pieceMoves;
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
    pathRef.current = move.path ?? [move.from, move.to];
    const { board: newBoard, capture, king } = applyMove(board, move, config);
    setBoard(newBoard);
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
      ReactGA.event({
        category: 'Checkers',
        action: 'game_over',
        label: 'draw',
      });
      saveMatch([...newHistory, { board: newBoard, turn: next, no: newNo }]);
      setLastMove(pathRef.current);
      pathRef.current = [];
      return;
    }
    const winnerColor = getWinner(newBoard, turn, config);
    if (winnerColor) {
      setWinner(winnerColor);
      ReactGA.event({ category: 'Checkers', action: 'game_over', label: turn });
      saveMatch([...newHistory, { board: newBoard, turn: next, no: newNo }]);
    } else {
      setTurn(next);
      if (!gameId && next === 'black') {
        workerRef.current?.postMessage({
          board: newBoard,
          color: 'black',
          maxDepth: depth,
          timeLimit,
          config,
        });
      }
    }
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove(pathRef.current);
    pathRef.current = [];
    if (gameId) {
      socketRef.current?.emit('move', { gameId, board: newBoard, turn: next });
    }
  };

  makeMoveRef.current = makeMove;

  const reset = () => {
    setBoard(createBoard(config));
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
    if (gameId) socketRef.current?.emit('undo', { gameId });
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
    if (!gameId && next.turn === 'black') {
      workerRef.current?.postMessage({
        board: next.board,
        color: 'black',
        maxDepth: depth,
        timeLimit,
        config,
      });
    }
    if (gameId)
      socketRef.current?.emit('state', {
        gameId,
        board: next.board,
        turn: next.turn,
      });
  };

  const hintMove = () => {
    hintRequest.current = true;
    workerRef.current?.postMessage({
      board,
      color: turn,
      maxDepth: depth,
      timeLimit,
      config,
    });
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4">
      <div className="mb-2 flex space-x-2 items-center">
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as Variant)}
          className="bg-gray-700 p-1 rounded"
        >
          <option value="standard">Standard</option>
          <option value="international">International</option>
          <option value="giveaway">Giveaway</option>
        </select>
        <label className="flex items-center space-x-1">
          <span>Depth</span>
          <input
            type="range"
            min={1}
            max={8}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          />
          <span>{depth}</span>
        </label>
        <label className="flex items-center space-x-1">
          <span>Time</span>
          <input
            type="range"
            min={100}
            max={1000}
            step={100}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
          />
          <span>{timeLimit}ms</span>
        </label>
        <input
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="Game ID"
          className="bg-gray-700 p-1 rounded text-white"
        />
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={spectate}
            onChange={(e) => setSpectate(e.target.checked)}
          />
          <span>Spectate</span>
        </label>
      </div>
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      {draw && <div className="mb-2 text-xl">Draw!</div>}
      <div
        className="grid gap-0"
        style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0,1fr))` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isLegalSource = !selected && legalFrom.has(`${r},${c}`);
            const isHint = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
            const isSelected =
              selected && selected[0] === r && selected[1] === c;
            const isLast = lastMove.some((p) => p[0] === r && p[1] === c);
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => (selected ? tryMove(r, c) : selectPiece(r, c))}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${isMove ? 'ring-2 ring-yellow-300' : ''} ${
                  isLegalSource ? 'ring-2 ring-indigo-400' : ''
                } ${
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
                      <span className="text-yellow-300 text-sm font-bold">
                        K
                      </span>
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
