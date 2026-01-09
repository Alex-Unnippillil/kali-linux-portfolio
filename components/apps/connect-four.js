import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GameLayout from './GameLayout';
import {
  ROWS,
  COLS,
  createEmptyBoard,
  applyMove,
  listValidColumns,
  evaluateColumns,
  getResultAfterMove,
  chooseAiMove,
} from '../../games/connect-four/solver';

const CELL_SIZE = 40; // tailwind h-10 w-10
const GAP = 4; // gap-1 => 4px
const SLOT = CELL_SIZE + GAP;
const BOARD_HEIGHT = ROWS * SLOT - GAP;

const COLORS = {
  red: 'bg-blue-500',
  yellow: 'bg-orange-400',
};

const COLOR_NAMES = {
  red: 'Blue',
  yellow: 'Orange',
};

const HUMAN_PLAYER = 'yellow';
const AI_PLAYER = 'red';

export default function ConnectFour() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [player, setPlayer] = useState(HUMAN_PLAYER);
  const [pending, setPending] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [result, setResult] = useState({ status: 'ongoing' });
  const [winningLine, setWinningLine] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [scores, setScores] = useState(Array(COLS).fill(null));
  const [difficulty, setDifficulty] = useState('medium');

  const validColumns = useMemo(() => listValidColumns(board), [board]);
  const lock = !!pending || result.status !== 'ongoing';

  const snapshotState = useCallback(
    () => ({
      board: board.map((r) => [...r]),
      player,
      result,
      winningLine,
      lastMove,
    }),
    [board, player, result, winningLine, lastMove],
  );

  useEffect(() => {
    setScores(evaluateColumns(board, player));
  }, [board, player]);

  const commitMove = useCallback(
    (current) => {
      const moveInfo = { row: current.row, col: current.col, player: current.player };
      setBoard(current.nextBoard);
      setLastMove(moveInfo);
      const outcome = getResultAfterMove(current.nextBoard, moveInfo);
      setResult(outcome);
      setWinningLine(outcome.line ?? null);
      if (outcome.status === 'ongoing') {
        setPlayer(current.player === 'red' ? 'yellow' : 'red');
      }
    },
    [],
  );

  const beginMove = useCallback(
    (col, currentPlayer) => {
      if (lock) return;
      const move = applyMove(board, col, currentPlayer);
      if (!move) return;
      setHistory((h) => [...h, snapshotState()]);
      setPending({
        id: Date.now(),
        col,
        row: move.row,
        player: currentPlayer,
        phase: 'start',
        fromY: -SLOT,
        toY: move.row * SLOT,
        nextBoard: move.board,
      });
    },
    [board, lock, snapshotState],
  );

  useEffect(() => {
    if (pending?.phase !== 'start') return undefined;
    const frame = requestAnimationFrame(() => {
      setPending((p) => (p ? { ...p, phase: 'falling' } : p));
    });
    return () => cancelAnimationFrame(frame);
  }, [pending]);

  const handleTransitionEnd = useCallback(() => {
    setPending((current) => {
      if (!current || current.phase !== 'falling') return current;
      commitMove(current);
      return null;
    });
  }, [commitMove]);

  const handleClick = (col) => {
    if (player !== HUMAN_PLAYER) return;
    beginMove(col, HUMAN_PLAYER);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length || pending) return h;
      const prev = h[h.length - 1];
      setBoard(prev.board);
      setPlayer(prev.player);
      setResult(prev.result);
      setWinningLine(prev.winningLine ?? null);
      setLastMove(prev.lastMove ?? null);
      setPending(null);
      return h.slice(0, -1);
    });
  };

  const reset = () => {
    if (pending) return;
    setBoard(createEmptyBoard());
    setPlayer(HUMAN_PLAYER);
    setResult({ status: 'ongoing' });
    setWinningLine(null);
    setLastMove(null);
    setHistory([]);
    setHoverCol(null);
  };

  useEffect(() => {
    if (player !== AI_PLAYER || lock) return;
    const { column } = chooseAiMove(board, AI_PLAYER, difficulty);
    beginMove(column, AI_PLAYER);
  }, [board, player, lock, difficulty, beginMove]);

  useEffect(() => {
    if (!lastMove) return;
    const outcome = getResultAfterMove(board, lastMove);
    setResult(outcome);
    setWinningLine(outcome.line ?? null);
  }, [board, lastMove]);

  const validScores = scores.filter((s) => s !== null);
  const minScore = validScores.length ? Math.min(...validScores) : 0;
  const maxScore = validScores.length ? Math.max(...validScores) : 0;
  const getColor = useCallback(
    (s) => {
      if (s == null || maxScore === minScore) return undefined;
      const t = (s - minScore) / (maxScore - minScore);
      const r = Math.round(255 * (1 - t));
      const g = Math.round(255 * t);
      return `rgba(${r}, ${g}, 0, 0.5)`;
    },
    [minScore, maxScore],
  );

  const boardWidth = COLS * SLOT - GAP;
  const hoveringValid =
    hoverCol !== null && validColumns.includes(hoverCol) && !lock && pending === null;

  const settingsPanel = (
    <div className="flex flex-col gap-2 text-sm text-white">
      <label className="flex items-center gap-2">
        <span>Difficulty</span>
        <select
          className="bg-gray-800 rounded px-2 py-1 text-white"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </label>
    </div>
  );

  return (
    <GameLayout gameId="connect-four" settingsPanel={settingsPanel}>
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 relative">
        {result.status !== 'ongoing' && (
          <div className="mb-2 capitalize">
            {result.status === 'draw'
              ? 'Draw!'
              : `${COLOR_NAMES[result.winner]} wins!`}
          </div>
        )}
        <button
          className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          onClick={reset}
          disabled={pending}
        >
          Restart
        </button>
        <div
          className="relative"
          style={{ width: boardWidth, height: BOARD_HEIGHT }}
          onMouseLeave={() => setHoverCol(null)}
        >
          {hoveringValid && (
            <div
              className="absolute"
              style={{
                transform: `translateX(${hoverCol * SLOT}px) translateY(-${SLOT}px)`,
              }}
            >
              <div className={`w-8 h-8 rounded-full opacity-70 ${COLORS[player]}`} />
            </div>
          )}
          <div className="grid grid-cols-7 gap-1">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <button
                  key={`${rIdx}-${cIdx}`}
                  aria-label={`cell-${rIdx}-${cIdx}`}
                  className="w-10 h-10 rounded-full flex items-center justify-center focus:outline-none bg-gray-700"
                  style={
                    hoverCol === cIdx && !lock
                      ? { backgroundColor: getColor(scores[cIdx]) }
                      : undefined
                  }
                  onClick={() => handleClick(cIdx)}
                  onMouseEnter={() => setHoverCol(cIdx)}
                  disabled={lock}
                >
                  {cell && <div className={`w-8 h-8 rounded-full ${COLORS[cell]}`} />}
                </button>
              )),
            )}
          </div>
          {winningLine?.cells?.length ? (
            <svg
              viewBox={`0 0 ${COLS} ${ROWS}`}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            >
              <line
                x1={winningLine.cells[0].c + 0.5}
                y1={winningLine.cells[0].r + 0.5}
                x2={winningLine.cells[winningLine.cells.length - 1].c + 0.5}
                y2={winningLine.cells[winningLine.cells.length - 1].r + 0.5}
                stroke="white"
                strokeWidth="0.2"
                strokeLinecap="round"
              />
            </svg>
          ) : null}
          {pending && (
            <div
              className="absolute"
              style={{
                transform: `translateX(${pending.col * SLOT}px) translateY(${
                  pending.phase === 'start' ? pending.fromY : pending.toY
                }px)`,
                transition: pending.phase === 'falling' ? 'transform 260ms ease-in' : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              <div className={`w-8 h-8 rounded-full ${COLORS[pending.player]}`} />
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            onClick={undo}
            disabled={history.length === 0 || !!pending}
          >
            Undo
          </button>
        </div>
      </div>
    </GameLayout>
  );
}
