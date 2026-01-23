import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import usePersistentState from '../../../hooks/usePersistentState';
import { Move, serializePosition } from './engine';
import {
  GameState,
  RuleMode,
  applyStep,
  chooseMove,
  createGameState,
  getForcedFromSquares,
  getLegalMoves,
  serializeGameState,
} from '../../../games/checkers/logic';

type Difficulty = 'easy' | 'medium' | 'hard';

type UndoSnapshot = {
  game: GameState;
  winner: string | null;
  draw: boolean;
  selected: [number, number] | null;
  moves: Move[];
  hint: Move | null;
  lastMove: [number, number][];
  ariaMessage: string;
  path: [number, number][];
  focusedCell: [number, number];
};

const difficultyDepth: Record<Difficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

const isRuleMode = (value: unknown): value is RuleMode =>
  value === 'forced' || value === 'relaxed';

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'medium' || value === 'hard';

const findInitialFocus = (state: GameState): [number, number] => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c]?.color === 'red') return [r, c];
    }
  }
  return [5, 0];
};

const Checkers = () => {
  const [rule, setRule] = usePersistentState<RuleMode>(
    'checkers:rule',
    'forced',
    isRuleMode,
  );
  const [difficulty, setDifficulty] = usePersistentState<Difficulty>(
    'checkers:difficulty',
    'medium',
    isDifficulty,
  );
  const [showLegal, setShowLegal] = usePersistentState<boolean>(
    'checkers:showLegal',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [game, setGame] = useState<GameState>(() => createGameState(rule));
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [hint, setHint] = useState<Move | null>(null);
  const [lastMove, setLastMove] = useState<[number, number][]>([]);
  const [ariaMessage, setAriaMessage] = useState('');
  const [focusedCell, setFocusedCell] = useState<[number, number]>(() => [5, 0]);
  const [aiThinking, setAiThinking] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<[number, number][]>([]);
  const workerRef = useRef<Worker | null>(null);
  const aiRequestIdRef = useRef(0);
  const aiThinkingRef = useRef(false);

  const focusBoard = () => boardRef.current?.focus();

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') return null;
    try {
      workerRef.current = new Worker(new URL('../../../workers/checkersAI.ts', import.meta.url));
    } catch {
      workerRef.current = null;
    }
    return workerRef.current;
  };

  const cancelAiWork = () => {
    aiRequestIdRef.current += 1;
    aiThinkingRef.current = false;
    setAiThinking(false);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    cancelAiWork();
    const next = createGameState(rule);
    setGame(next);
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    setAriaMessage('');
    setUndoStack([]);
    pathRef.current = [];
    setFocusedCell(findInitialFocus(next));
  }, [rule]);

  useEffect(() => {
    if (game.turnState.pendingCaptureFrom) {
      const [r, c] = game.turnState.pendingCaptureFrom;
      const legal = getLegalMoves(game).filter((m) => m.from[0] === r && m.from[1] === c);
      setSelected([r, c]);
      setMoves(legal);
      setFocusedCell([r, c]);
    }
  }, [game]);

  useEffect(() => {
    if (winner || draw) {
      cancelAiWork();
    }
  }, [winner, draw]);

  const forced = useMemo(() => getForcedFromSquares(game), [game]);
  const legalMoves = useMemo(() => getLegalMoves(game), [game]);
  const pieceCounts = useMemo(() => {
    let red = 0;
    let black = 0;
    for (const row of game.board) {
      for (const cell of row) {
        if (!cell) continue;
        if (cell.color === 'red') red += 1;
        else black += 1;
      }
    }
    return {
      red,
      black,
      capturedRed: Math.max(0, 12 - red),
      capturedBlack: Math.max(0, 12 - black),
    };
  }, [game.board]);

  const isHumanTurn = game.turnState.turn === 'red';
  const selectionLocked = Boolean(game.turnState.pendingCaptureFrom);
  const controlsDisabled = aiThinking || Boolean(winner) || draw;
  const hintDisabled = !isHumanTurn || controlsDisabled;
  const undoDisabled =
    controlsDisabled || selectionLocked || undoStack.length === 0 || !isHumanTurn;

  const pushUndoSnapshot = (snapshot: UndoSnapshot) => {
    setUndoStack((prev) => [...prev, snapshot]);
  };

  const buildPath = (move: Move, path: [number, number][]) =>
    path.length ? [...path, move.to] : [move.from, move.to];

  const applyAndUpdate = (move: Move) => {
    if (isHumanTurn && !selectionLocked) {
      pushUndoSnapshot({
        game,
        winner,
        draw,
        selected,
        moves,
        hint,
        lastMove,
        ariaMessage,
        path: pathRef.current,
        focusedCell,
      });
    }

    const { next, events } = applyStep(game, move);
    const path = buildPath(move, pathRef.current);
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
      ReactGA.event({ category: 'Checkers', action: 'game_over', label: events.winner });
    } else if (events.draw) {
      setDraw(true);
      ReactGA.event({ category: 'Checkers', action: 'game_over', label: 'draw' });
    }

    if (events.turnEnded) {
      pathRef.current = [];
    }
  };

  const selectPiece = (r: number, c: number) => {
    if (!isHumanTurn || winner || draw || aiThinking) return;
    const piece = game.board[r][c];
    if (!piece || piece.color !== game.turnState.turn) return;
    const key = `${r}-${c}`;
    if (selectionLocked && (!selected || selected[0] !== r || selected[1] !== c)) {
      setAriaMessage('Continue capture.');
      return;
    }
    if (forced.size && !forced.has(key)) {
      setAriaMessage('Forced capture required.');
      return;
    }
    const pieceMoves = legalMoves.filter((m) => m.from[0] === r && m.from[1] === c);
    if (pieceMoves.length) {
      setSelected([r, c]);
      setMoves(pieceMoves);
      setAriaMessage(
        `${pieceMoves.length} legal move${pieceMoves.length > 1 ? 's' : ''} available`,
      );
    }
  };

  const handleCellAction = (r: number, c: number) => {
    setFocusedCell([r, c]);
    if (winner || draw || aiThinking) return;

    if (selected && selected[0] === r && selected[1] === c) {
      if (!selectionLocked) {
        setSelected(null);
        setMoves([]);
        setAriaMessage('Selection cleared.');
      } else {
        setAriaMessage('Continue capture.');
      }
      return;
    }

    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move && isHumanTurn) {
      applyAndUpdate(move);
      focusBoard();
      return;
    }

    selectPiece(r, c);
  };

  const hintMove = () => {
    if (hintDisabled) return;
    const move = chooseMove(game, difficultyDepth[difficulty]);
    setHint(move);
    if (move) {
      setTimeout(() => setHint(null), 1000);
    }
  };

  const reset = () => {
    cancelAiWork();
    const next = createGameState(rule);
    setGame(next);
    setWinner(null);
    setDraw(false);
    setSelected(null);
    setMoves([]);
    setHint(null);
    setLastMove([]);
    setAriaMessage('');
    setUndoStack([]);
    pathRef.current = [];
    setFocusedCell(findInitialFocus(next));
  };

  const undo = () => {
    if (undoDisabled) return;
    cancelAiWork();
    setUndoStack((prev) => {
      const next = [...prev];
      const snapshot = next.pop();
      if (!snapshot) return prev;
      setGame(snapshot.game);
      setWinner(snapshot.winner);
      setDraw(snapshot.draw);
      setSelected(snapshot.selected);
      setMoves(snapshot.moves);
      setHint(snapshot.hint);
      setLastMove(snapshot.lastMove);
      setAriaMessage(snapshot.ariaMessage);
      pathRef.current = snapshot.path;
      setFocusedCell(snapshot.focusedCell);
      return next;
    });
  };

  useEffect(() => {
    const runAiTurn = async () => {
      if (winner || draw) return;
      if (game.turnState.turn !== 'black') return;
      if (aiThinkingRef.current) return;
      aiThinkingRef.current = true;
      setAiThinking(true);
      setAriaMessage('AI thinking.');
      setSelected(null);
      setMoves([]);
      setHint(null);

      let current = game;
      let path: [number, number][] = pathRef.current;
      const depth = difficultyDepth[difficulty];
      const requestId = aiRequestIdRef.current + 1;
      aiRequestIdRef.current = requestId;

      const getMove = async () => {
        const worker = ensureWorker();
        if (!worker) {
          return new Promise<Move | null>((resolve) => {
            const run = () => resolve(chooseMove(current, depth));
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              (window as any).requestIdleCallback(run, { timeout: 150 });
            } else {
              setTimeout(run, 0);
            }
          });
        }
        return new Promise<Move | null>((resolve) => {
          worker.onmessage = (event) => {
            const data = event.data as {
              type: string;
              move: Move | null;
              requestId?: number;
            };
            if (data?.type !== 'chooseMoveResult') return;
            if (data.requestId !== requestId) return;
            resolve(data.move ?? null);
          };
          worker.postMessage({
            type: 'chooseMove',
            state: serializeGameState(current),
            depth,
            requestId,
          });
        });
      };

      while (current.turnState.turn === 'black' && !winner && !draw) {
        if (aiRequestIdRef.current !== requestId) break;
        const move = await getMove();
        if (aiRequestIdRef.current !== requestId) break;
        if (!move) {
          setWinner('red');
          break;
        }
        const { next, events } = applyStep(current, move);
        path = buildPath(move, path);
        pathRef.current = path;
        setGame(next);
        setLastMove(path);

        if (events.winner) {
          setWinner(events.winner);
          break;
        }
        if (events.draw) {
          setDraw(true);
          break;
        }
        if (events.turnEnded) {
          pathRef.current = [];
          break;
        }
        current = next;
      }

      aiThinkingRef.current = false;
      setAiThinking(false);
      setAriaMessage('');
    };

    runAiTurn();
  }, [game, winner, draw, difficulty]);

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

  const forcedClass = (r: number, c: number) =>
    forced.has(`${r}-${c}`) ? 'ring-4 ring-amber-400' : '';

  useEffect(() => {
    focusBoard();
  }, []);

  const moveLabel = isHumanTurn ? "It's Red's move." : "It's Black's move.";
  const movesToDraw = Math.max(0, 40 - game.noCaptureMoves);

  const handleBoardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const [r, c] = focusedCell;
    let next: [number, number] | null = null;
    switch (event.key) {
      case 'ArrowUp':
        next = [Math.max(0, r - 1), c];
        break;
      case 'ArrowDown':
        next = [Math.min(7, r + 1), c];
        break;
      case 'ArrowLeft':
        next = [r, Math.max(0, c - 1)];
        break;
      case 'ArrowRight':
        next = [r, Math.min(7, c + 1)];
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleCellAction(r, c);
        return;
      default:
        return;
    }
    event.preventDefault();
    setFocusedCell(next);
  };

  const describeCell = (r: number, c: number, cell: GameState['board'][number][number]) => {
    const isDark = (r + c) % 2 === 1;
    if (!isDark) return `Row ${r + 1}, Column ${c + 1}, light square`;
    if (!cell) return `Row ${r + 1}, Column ${c + 1}, empty dark square`;
    return `Row ${r + 1}, Column ${c + 1}, ${cell.color} ${cell.king ? 'king' : 'piece'}`;
  };

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
        <p className="mt-2 text-kali-text/80">Crowning ends the turn.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-kali-text/70">
          <span>Capture-ready pieces: {forced.size}</span>
          <span>Captured pieces: R {pieceCounts.capturedRed} | B {pieceCounts.capturedBlack}</span>
          <span>Moves to draw: {movesToDraw}</span>
        </div>
      </div>
      {winner && <div className="mb-2 text-xl">{winner} wins!</div>}
      {draw && <div className="mb-2 text-xl">Draw!</div>}
      {aiThinking && <div className="mb-2 text-sm text-kali-accent">AI thinking…</div>}
      {selectionLocked && (
        <div className="mb-2 text-sm text-kali-text/70">Continue capture.</div>
      )}
      <div
        ref={boardRef}
        tabIndex={0}
        role="grid"
        aria-label="Checkers board"
        aria-rowcount={8}
        aria-colcount={8}
        aria-activedescendant={`checkers-cell-${focusedCell[0]}-${focusedCell[1]}`}
        className="grid grid-cols-8 gap-0 outline-none"
        style={{ width: 'min(90vw, 32rem)', aspectRatio: '1 / 1' }}
        onKeyDown={handleBoardKeyDown}
      >
        {game.board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isHint = hint && hint.from[0] === r && hint.from[1] === c;
            const isHintDest = hint && hint.to[0] === r && hint.to[1] === c;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isLast = lastMove.some((p) => p[0] === r && p[1] === c);
            const isFocused = focusedCell[0] === r && focusedCell[1] === c;
            const showMove = showLegal && isMove;
            return (
              <div
                key={`${r}-${c}`}
                id={`checkers-cell-${r}-${c}`}
                role="gridcell"
                aria-selected={Boolean(isSelected)}
                aria-label={describeCell(r, c, cell)}
                aria-rowindex={r + 1}
                aria-colindex={c + 1}
                onPointerUp={() => handleCellAction(r, c)}
                className={`flex h-full w-full items-center justify-center focus:outline-none ${
                  isDark ? 'bg-kali-panel-dark' : 'bg-kali-panel-light'
                } ${
                  showMove
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-kali-dark drop-shadow-[0_0_8px_#fbbf24] motion-safe:animate-glow'
                    : ''
                } ${isHint || isHintDest ? 'ring-2 ring-kali-accent motion-safe:animate-pulse' : ''} ${
                  isSelected ? 'ring-2 ring-kali-control' : ''
                } ${isLast ? 'ring-2 ring-kali-error' : ''} ${forcedClass(r, c)} ${
                  isFocused ? 'ring-2 ring-kali-focus' : ''
                }`}
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
                className="ml-1 rounded border border-kali-border/60 bg-kali-panel-dark px-2 py-1 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-kali-focus focus:ring-offset-2 focus:ring-offset-kali-dark disabled:opacity-60"
                value={rule}
                onChange={(e) => setRule(e.target.value as RuleMode)}
                disabled={controlsDisabled}
              >
                <option value="forced">Forced Capture</option>
                <option value="relaxed">Capture Optional</option>
              </select>
            </label>
            <label className="flex items-center gap-1 font-medium">
              Difficulty:
              <select
                className="ml-1 rounded border border-kali-border/60 bg-kali-panel-dark px-2 py-1 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-kali-focus focus:ring-offset-2 focus:ring-offset-kali-dark disabled:opacity-60"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                disabled={controlsDisabled}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <button
              className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-60"
              onClick={hintMove}
              disabled={hintDisabled}
            >
              Hint
            </button>
            {!isHumanTurn && !winner && !draw && (
              <span className="text-xs text-kali-text/60">Hint available on Red&apos;s turn.</span>
            )}
            <button
              className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setShowLegal((s) => !s)}
              aria-pressed={showLegal}
              disabled={controlsDisabled}
            >
              {showLegal ? 'Hide Moves' : 'Show Moves'}
            </button>
            <button
              className="rounded border border-kali-border/60 bg-kali-accent/90 px-2 py-1 font-medium text-kali-dark transition-colors hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-60"
              onClick={undo}
              disabled={undoDisabled}
            >
              Undo
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
          disabled={aiThinking}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Checkers;
