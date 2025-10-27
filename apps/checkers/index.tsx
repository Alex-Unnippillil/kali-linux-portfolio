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

const formatPlayer = (color: 'red' | 'black') => (color === 'red' ? 'Red' : 'Black');

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
  const positionCounts = useRef<Map<string, number>>(new Map());
  const [crowned, setCrowned] = useState<[number, number] | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const hintRequest = useRef(false);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<[number, number][]>([]);

  const captureOpportunities = useMemo(() => {
    let total = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === turn) {
          total += getPieceMoves(board, r, c, false).filter((m) => m.captures.length).length;
        }
      }
    }
    return total;
  }, [board, turn]);

  const movesUntilDraw = useMemo(() => Math.max(0, 40 - noCapture), [noCapture]);

  const pieceCounts = useMemo(() => {
    let redPieces = 0;
    let blackPieces = 0;
    board.forEach((row) => {
      row.forEach((cell) => {
        if (!cell) return;
        if (cell.color === 'red') redPieces += 1;
        else blackPieces += 1;
      });
    });
    return { red: redPieces, black: blackPieces };
  }, [board]);

  const makeMove = useCallback(
    (move: Move) => {
      const actingPlayer = turn;
      setHistory((h) => [...h, { board, turn, noCapture }]);
      const { board: newBoard, capture, king } = applyMove(board, move);
      setBoard(newBoard);
      if (king) {
        const destination = move.path[move.path.length - 1];
        setCrowned([destination[0], destination[1]]);
      }
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
      if (move.path.length >= 2) {
        setLastMoveSquares([...move.path]);
        const notation = move.path
          .map(squareNotation)
          .join(move.captures.length ? 'x' : '-');
        setMoveLog((prev) => [...prev, { player: actingPlayer, notation }]);
      }
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
    positionCounts.current = new Map([[JSON.stringify(initial), 1]]);
    setCrowned(null);
    setHint(null);
    hintRequest.current = false;
    setMoveLog([]);
    setLastMoveSquares([]);
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
    setLastMoveSquares([]);
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

  const boardSurfaceStyle = useMemo<React.CSSProperties>(
    () => ({
      background:
        'linear-gradient(145deg, color-mix(in srgb, var(--kali-panel) 92%, transparent), color-mix(in srgb, var(--kali-control) 22%, var(--kali-panel)))',
    }),
    [],
  );

  const pieceSurfaces = useMemo(
    () => ({
      red:
        'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--color-severity-high) 65%, var(--kali-control)), color-mix(in srgb, var(--kali-panel) 82%, transparent))',
      black:
        'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--kali-panel) 88%, transparent), color-mix(in srgb, var(--kali-control) 15%, var(--kali-panel)))',
    }),
    [],
  );

  const PanelContent = ({ variant }: { variant: 'mobile' | 'desktop' }) => {
    const badgeBase =
      'inline-flex items-center gap-2 rounded-full border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[color:var(--kali-control)]';

    return (
      <div className={`flex flex-col gap-4 ${variant === 'mobile' ? 'h-full' : ''} text-xs`}>
        <section className="space-y-2">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-[color:var(--kali-control)]">
            Match telemetry
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className={badgeBase}>
              Captures left
              <span className="rounded bg-[color:color-mix(in_srgb,var(--kali-control)_25%,var(--kali-panel))] px-2 py-0.5 font-mono text-[0.7rem] text-[color:var(--kali-text)]">
                {captureOpportunities}
              </span>
            </span>
            <span className={badgeBase}>
              Moves to draw
              <span className="rounded bg-[color:color-mix(in_srgb,var(--kali-control)_25%,var(--kali-panel))] px-2 py-0.5 font-mono text-[0.7rem] text-[color:var(--kali-text)]">
                {movesUntilDraw}
              </span>
            </span>
            <span className={badgeBase}>
              Pieces
              <span className="rounded bg-[color:color-mix(in_srgb,var(--kali-control)_25%,var(--kali-panel))] px-2 py-0.5 font-mono text-[0.7rem] text-[color:var(--kali-text)]">
                {pieceCounts.red}/{pieceCounts.black}
              </span>
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-[color:var(--kali-control)]">
            Configuration
          </h3>
          <div
            className={`flex flex-col gap-3 ${
              variant === 'desktop' ? 'md:flex-row md:flex-wrap md:items-end' : ''
            }`}
          >
            <label className="flex flex-col gap-1 text-xs md:flex-auto">
              <span className="uppercase tracking-wide text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">Rules</span>
              <select
                className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-2 py-1 text-sm text-[color:var(--kali-text)]"
                value={rule}
                onChange={(e) => setRule(e.target.value as 'forced' | 'relaxed')}
              >
                <option value="forced">Forced Capture</option>
                <option value="relaxed">Capture Optional</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs md:flex-auto">
              <span className="uppercase tracking-wide text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">AI</span>
              <select
                className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-2 py-1 text-sm text-[color:var(--kali-text)]"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'alphabeta' | 'mcts')}
              >
                <option value="alphabeta">Alpha-Beta</option>
                <option value="mcts">MCTS</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs md:flex-[1_1_100%]">
              <span className="uppercase tracking-wide text-[0.65rem] text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">Difficulty</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  aria-label="Difficulty"
                  className="h-2 flex-1 accent-amber-400"
                />
                <span className="tabular-nums text-sm text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">{difficulty}</span>
              </div>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-widest text-[color:var(--kali-control)]">
            Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-1 text-sm transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_20%,var(--kali-panel))]"
              onClick={reset}
            >
              Reset
            </button>
            <button
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-1 text-sm transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_20%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={undo}
              disabled={!history.length}
            >
              Undo
            </button>
            <button
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent)] px-3 py-1 text-sm transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_20%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={hintMove}
              disabled={!!winner}
            >
              Hint
            </button>
          </div>
        </section>

        <section
          className={`space-y-2 rounded-md bg-[color:var(--kali-panel-highlight)] p-2 ${
            variant === 'mobile' ? 'flex-1 overflow-y-auto' : 'max-h-[28rem] overflow-y-auto'
          }`}
          aria-label="Move log"
          aria-live="polite"
        >
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
            <span>Moves</span>
            <span className="capitalize text-[color:var(--kali-text)]">
              {winner ? (winner === 'Draw' ? 'Draw' : `${winner} wins`) : `Turn: ${turn}`}
            </span>
          </div>
          {moveLog.length ? (
            <ol className="space-y-1 text-sm" role="list">
              {moveLog.map((entry, idx) => {
                const moveNumber = Math.floor(idx / 2) + 1;
                const prefix = idx % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
                return (
                  <li
                    key={`${entry.notation}-${idx}`}
                    className={`grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded px-2 py-1 ${
                      idx % 2 === 0
                        ? 'bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)]'
                        : 'bg-[color:color-mix(in_srgb,var(--kali-control)_18%,var(--kali-panel))]'
                    }`}
                  >
                    <span className="font-mono text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">{prefix}</span>
                    <span
                      className={`text-xs font-semibold capitalize ${
                        entry.player === 'red'
                          ? 'text-[color:color-mix(in_srgb,var(--color-severity-high)_75%,var(--kali-control))]'
                          : 'text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]'
                      }`}
                    >
                      {entry.player}
                    </span>
                    <span className="font-mono text-sm text-[color:var(--kali-text)]">{entry.notation}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)]">Moves will appear once play begins.</p>
          )}
        </section>
      </div>
    );
  };

  return (
    <div
      className="relative flex h-full w-full flex-col bg-ub-cool-grey text-white md:flex-row"
      style={layoutStyle}
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pt-6 md:py-8"
        style={{ paddingBottom: 'var(--panel-height)' }}
      >
        <div className="w-[var(--board-size)] max-w-full">
          <div className="mb-4 space-y-2 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-4 py-3 text-[0.8rem] text-[color:var(--kali-text)] shadow-lg shadow-kali-panel">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[color:var(--kali-control)]">
              Match briefing
            </p>
            <p className="text-[0.75rem] leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
              <span className="font-semibold text-[color:var(--kali-text)]">
                {winner
                  ? winner === 'Draw'
                    ? 'The match ends in a draw.'
                    : `${formatPlayer(winner as 'red' | 'black')} wins the match.`
                  : `It's ${formatPlayer(turn)}'s move.`}
              </span>{' '}
              Use the board or the Tab key to focus a square, then press Enter to select a
              piece and complete moves.
            </p>
            <p className="text-[0.75rem] leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
              <span className="font-semibold text-[color:var(--kali-control)]">Quick tip:</span>{' '}
              {winner
                ? 'Hints are disabled after the final move.'
                : `Tap Hint to briefly light up a ${formatPlayer(turn)} move. Undo rewinds the last turn if you need a redo.`}
            </p>
            <p className="text-[0.75rem] leading-relaxed text-[color:color-mix(in_srgb,var(--kali-text)_85%,transparent)]">
              <span className="font-semibold text-[color:var(--kali-control)]">Rule set:</span>{' '}
              {rule === 'forced'
                ? 'Forced capture is active — jumps must be taken when available.'
                : 'Relaxed capture is active — jumps are optional if you prefer positioning.'}
            </p>
          </div>
          <div
            className="relative h-[var(--board-size)] w-full rounded-3xl border border-white/10 p-3 shadow-xl shadow-kali-panel"
            style={boardSurfaceStyle}
          >
            <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-[0.35rem]">
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
                  const isSelected = selected ? selected[0] === r && selected[1] === c : false;
                  const isCrowned = crowned && crowned[0] === r && crowned[1] === c;
                  const hintPath = hint?.path ?? [];
                  const isHintStart =
                    hintPath.length > 0 && hintPath[0][0] === r && hintPath[0][1] === c;
                  const isHintDest = hintPath.slice(1).some(([hr, hc]) => hr === r && hc === c);
                  const lastMoveIndex = lastMoveSquares.findIndex(
                    ([lr, lc]) => lr === r && lc === c,
                  );
                  const isLastMoveSquare = lastMoveIndex !== -1;
                  const isLastMoveStart =
                    lastMoveSquares.length > 0 &&
                    lastMoveSquares[0][0] === r &&
                    lastMoveSquares[0][1] === c;
                  const isLastMoveEnd =
                    lastMoveSquares.length > 0 &&
                    lastMoveSquares[lastMoveSquares.length - 1][0] === r &&
                    lastMoveSquares[lastMoveSquares.length - 1][1] === c;
                  const notation = squareNotation([r, c]);
                  const occupantLabel = cell
                    ? `${cell.king ? 'King ' : ''}${cell.color === 'red' ? 'Red' : 'Black'} piece`
                    : 'Empty square';
                  const activateSquare = () =>
                    selected ? tryMove(r, c) : selectPiece(r, c);
                  const squareClasses = [
                    'board-square',
                    isDark
                      ? 'bg-slate-700/90 text-white shadow-[inset_0_2px_6px_rgba(15,23,42,0.65)]'
                      : 'bg-slate-200/90 text-slate-900 shadow-[inset_0_2px_6px_rgba(148,163,184,0.6)]',
                  ];
                  if (isLastMoveSquare) squareClasses.push('last-move-square');
                  if (isLastMoveStart) squareClasses.push('last-move-start');
                  if (isLastMoveEnd) squareClasses.push('last-move-end');
                  if (isMove) squareClasses.push('move-square');
                  if (isHintStart || isHintDest) squareClasses.push('hint-square');
                  if (isSelected) squareClasses.push('selected-square');
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      {...pointerHandlers(activateSquare)}
                      className={squareClasses.join(' ')}
                      aria-label={`${notation}: ${occupantLabel}`}
                      aria-pressed={isSelected}
                    >
                      {cell && (
                        <div
                          className={`flex h-[70%] w-[70%] items-center justify-center rounded-full shadow-lg shadow-black/60 ${
                            cell.king
                              ? 'ring-4 ring-offset-2 ring-offset-black/60 ring-yellow-300'
                              : 'ring-2 ring-offset-2 ring-offset-black/60 ring-black/30'
                          } ${isCrowned ? 'motion-safe:animate-flourish' : ''}`}
                          style={{
                            background: cell.color === 'red' ? pieceSurfaces.red : pieceSurfaces.black,
                            color: 'var(--kali-text)',
                          }}
                        />
                      )}
                    </button>
                  );
                }),
              )}
            </div>
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
