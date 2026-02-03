import React, { useEffect, useMemo, useRef, useState } from 'react';
import { logEvent } from '../../../utils/analytics';
import { pointerHandlers } from '../../../utils/pointer';
import { Move, serializePosition } from './engine';
import {
  GameState,
  RuleMode,
  applyStep,
  chooseMove,
  createGameState,
  getForcedFromSquares,
  getLegalMoves,
} from '../../../games/checkers/logic';

const Checkers = () => {
  const [rule, setRule] = useState<RuleMode>('forced');
  const [game, setGame] = useState<GameState>(() => createGameState('forced'));
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [hint, setHint] = useState<Move | null>(null);
  const [lastMove, setLastMove] = useState<[number, number][]>([]);
  const [showLegal, setShowLegal] = useState(false);
  const [ariaMessage, setAriaMessage] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const pathRef = useRef<[number, number][]>([]);

  useEffect(() => {
    const next = createGameState(rule);
    setGame(next);
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setLastMove([]);
    pathRef.current = [];
  }, [rule]);

  useEffect(() => {
    if (game.turnState.pendingCaptureFrom) {
      const [r, c] = game.turnState.pendingCaptureFrom;
      const legal = getLegalMoves(game).filter((m) => m.from[0] === r && m.from[1] === c);
      setSelected([r, c]);
      setMoves(legal);
    }
  }, [game]);

  const forced = useMemo(() => getForcedFromSquares(game), [game]);
  const legalMoves = useMemo(() => getLegalMoves(game), [game]);

  const focusBoard = () => boardRef.current?.focus();

  const selectPiece = (r: number, c: number) => {
    const piece = game.board[r][c];
    if (!piece || piece.color !== game.turnState.turn || winner || draw) return;
    const key = `${r}-${c}`;
    if (forced.size && !forced.has(key)) return;
    const pieceMoves = legalMoves.filter((m) => m.from[0] === r && m.from[1] === c);
    if (pieceMoves.length) {
      setSelected([r, c]);
      setMoves(pieceMoves);
      setAriaMessage(`${pieceMoves.length} legal move${pieceMoves.length > 1 ? 's' : ''} available`);
    }
  };

  const applyAndUpdate = (move: Move) => {
    const { next, events } = applyStep(game, move);
    const path = pathRef.current.length ? [...pathRef.current, move.to] : [move.from, move.to];
    pathRef.current = path;
    setGame(next);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove(path);

    if (events.kinged) {
      setAriaMessage(`Piece crowned at row ${move.to[0] + 1}, column ${move.to[1] + 1}`);
    } else {
      setAriaMessage('');
    }

    if (events.winner) {
      setWinner(events.winner);
      logEvent({ category: 'Checkers', action: 'game_over', label: events.winner });
    } else if (events.draw) {
      setDraw(true);
      logEvent({ category: 'Checkers', action: 'game_over', label: 'draw' });
    }

    if (events.turnEnded) {
      pathRef.current = [];
    }
  };

  const tryMove = (r: number, c: number) => {
    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) {
      applyAndUpdate(move);
      focusBoard();
    }
  };

  const hintMove = () => {
    if (winner || draw) return;
    const move = chooseMove(game, 4);
    setHint(move);
    if (move) {
      setTimeout(() => setHint(null), 1000);
    }
  };

  const reset = () => {
    const next = createGameState(rule);
    setGame(next);
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    pathRef.current = [];
    setAriaMessage('');
  };

  useEffect(() => {
    const runAi = async () => {
      if (winner || draw) return;
      if (game.turnState.turn !== 'black') return;
      let current = game;
      while (current.turnState.turn === 'black' && !winner && !draw) {
        const move = chooseMove(current, 4);
        if (!move) {
          setWinner('red');
          return;
        }
        const { next, events } = applyStep(current, move);
        setGame(next);
        setLastMove((prev) => {
          const path = prev.length ? prev : [move.from];
          return [...path, move.to];
        });
        if (events.winner) {
          setWinner(events.winner);
        }
        if (events.draw) {
          setDraw(true);
          break;
        }
        if (events.turnEnded) break;
        current = next;
      }
    };
    runAi();
  }, [game, winner, draw]);

  const exportState = () => {
    const key = serializePosition(
      game.board,
      game.turnState.turn,
      game.turnState.pendingCaptureFrom,
      game.rules.mode,
    );
    const blob = new Blob([key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'checkers-state.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const forcedClass = (r: number, c: number) => (forced.has(`${r}-${c}`) ? 'ring-4 ring-amber-400' : '');

  useEffect(() => {
    focusBoard();
  }, []);

  const moveLabel = game.turnState.turn === 'red' ? "It's Red's move." : "It's Black's move.";
  const capturesLeft = forced.size;
  const movesToDraw = Math.max(0, 40 - game.noCaptureMoves);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-kali-background text-kali-text p-4">
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      <div className="mb-4 w-full max-w-3xl rounded-lg border border-kali-border/60 bg-kali-panel p-4 text-sm text-kali-text shadow-inner">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-kali-text/70">Match briefing</h2>
        <p className="mt-2">{moveLabel}</p>
        <p className="mt-2 text-kali-text/80">Tap the Hint button to highlight a recommended capture sequence.</p>
        {rule === 'forced' && (
          <p className="mt-2 text-kali-text/80">Forced capture is active.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-kali-text/70">
          <span>Captures left: {capturesLeft}</span>
          <span>Moves to draw: {movesToDraw}</span>
        </div>
      </div>
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      {draw && <div className="mb-2 text-xl">Draw!</div>}
      <div
        ref={boardRef}
        tabIndex={0}
        aria-label="Checkers board"
        className="grid grid-cols-8 gap-0 outline-none"
      >
        {game.board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isHint = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isLast = lastMove.some((p) => p[0] === r && p[1] === c);
            const showMove = showLegal && isMove;
            return (
              <div
                key={`${r}-${c}`}
                ref={(el) => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  cellRefs.current[r][c] = el;
                }}
                tabIndex={0}
                {...pointerHandlers(() => (selected ? tryMove(r, c) : selectPiece(r, c)))}
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-kali-focus ${
                  isDark ? 'bg-kali-panel-dark' : 'bg-kali-panel-light'
                } ${
                  showMove
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-kali-dark drop-shadow-[0_0_8px_#fbbf24] motion-safe:animate-glow'
                    : ''
                } ${isHint || isHintDest ? 'ring-2 ring-kali-accent motion-safe:animate-pulse' : ''} ${
                  isSelected ? 'ring-2 ring-kali-control' : ''
                } ${isLast ? 'ring-2 ring-kali-error' : ''} ${forcedClass(r, c)}`}
              >
                {cell && (
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-kali-error text-white' : 'bg-kali-accent text-kali-dark'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''}`}
                  >
                    {cell.king && <span className="text-yellow-300 text-sm font-bold">K</span>}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {winner || draw ? (
          <button
            className="rounded border border-kali-border/60 bg-kali-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-kali-error/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            onClick={reset}
          >
            Reset
          </button>
        ) : (
          <>
            <span className="mr-2 font-semibold text-kali-control">Turn: {game.turnState.turn}</span>
            <label className="flex items-center gap-1 font-medium">
              Rules:
              <select
                className="ml-1 rounded border border-kali-border/60 bg-kali-panel-dark px-2 py-1 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-kali-focus focus:ring-offset-2 focus:ring-offset-kali-dark"
                value={rule}
                onChange={(e) => setRule(e.target.value as RuleMode)}
              >
                <option value="forced">Forced Capture</option>
                <option value="relaxed">Capture Optional</option>
              </select>
            </label>
            <button
              className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={hintMove}
            >
              Hint
            </button>
            <button
              className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => setShowLegal((s) => !s)}
              aria-pressed={showLegal}
            >
              {showLegal ? 'Hide Moves' : 'Show Moves'}
            </button>
          </>
        )}
        <button
          className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          onClick={exportState}
        >
          Export State
        </button>
        <button
          className="rounded border border-kali-border/60 bg-kali-error/80 px-2 py-1 font-medium text-white transition-colors hover:bg-kali-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Checkers;
