"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import { toPng } from 'html-to-image';
import useOPFSLeaderboard from '../../hooks/useOPFSLeaderboard';
import {
  GameState,
  Direction,
  applyMove,
  createInitialState,
  highestTile,
  cloneBoard,
} from '../../apps/games/_2048/logic';
import { findHint } from '../../apps/games/_2048/ai';
import { startRecording, recordMove, downloadReplay } from './replay';

const UNDO_LIMIT = 5;
const INITIAL_SIZE = 4;

const SKINS: Record<string, Record<number, string>> = {
  classic: {
    2: 'bg-neutral-300 text-neutral-800',
    4: 'bg-neutral-400 text-neutral-800',
    8: 'bg-amber-400 text-white',
    16: 'bg-amber-500 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-orange-600 text-white',
    128: 'bg-red-500 text-white',
    256: 'bg-red-600 text-white',
    512: 'bg-red-700 text-white',
    1024: 'bg-green-500 text-white',
    2048: 'bg-green-600 text-white',
  },
  neon: {
    2: 'bg-pink-500 text-white',
    4: 'bg-fuchsia-500 text-white',
    8: 'bg-purple-500 text-white',
    16: 'bg-indigo-500 text-white',
    32: 'bg-blue-500 text-white',
    64: 'bg-cyan-500 text-white',
    128: 'bg-teal-500 text-white',
    256: 'bg-lime-500 text-white',
    512: 'bg-yellow-500 text-white',
    1024: 'bg-orange-500 text-white',
    2048: 'bg-red-500 text-white',
  },
};

type ReducerState = {
  game: GameState;
  history: GameState[];
  undosLeft: number;
  paused: boolean;
  merges: Array<[number, number]>;
  runId: number;
  moveToken: number;
  lastDirection: Direction | null;
};

type Action =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'UNDO' }
  | { type: 'RESTART'; size?: number }
  | { type: 'SET_SIZE'; size: number }
  | { type: 'KEEP_PLAYING' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CLEAR_MERGES' };

const snapshotGame = (game: GameState): GameState => ({
  ...game,
  board: cloneBoard(game.board),
});

const createInitialReducerState = (size = INITIAL_SIZE): ReducerState => ({
  game: createInitialState(size),
  history: [],
  undosLeft: UNDO_LIMIT,
  paused: false,
  merges: [],
  runId: 0,
  moveToken: 0,
  lastDirection: null,
});

const reducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'MOVE': {
      if (state.paused) return state;
      const outcome = applyMove(state.game, action.direction);
      if (!outcome.moved) return state;
      const history = [...state.history, snapshotGame(state.game)];
      if (history.length > UNDO_LIMIT) history.shift();
      return {
        ...state,
        game: outcome.next,
        history,
        merges: outcome.merges,
        moveToken: state.moveToken + 1,
        lastDirection: action.direction,
      };
    }
    case 'UNDO': {
      if (!state.history.length || state.undosLeft === 0 || state.paused) return state;
      const previous = state.history[state.history.length - 1];
      return {
        ...state,
        game: previous,
        history: state.history.slice(0, -1),
        undosLeft: state.undosLeft - 1,
        merges: [],
        lastDirection: null,
      };
    }
    case 'RESTART': {
      const game = createInitialState(action.size ?? state.game.size);
      return {
        ...createInitialReducerState(game.size),
        game,
        runId: state.runId + 1,
      };
    }
    case 'SET_SIZE': {
      const game = createInitialState(action.size);
      return {
        ...createInitialReducerState(action.size),
        game,
        runId: state.runId + 1,
      };
    }
    case 'KEEP_PLAYING':
      return { ...state, game: { ...state.game, keepPlaying: true }, merges: [] };
    case 'PAUSE':
      return { ...state, paused: true };
    case 'RESUME':
      return { ...state, paused: false };
    case 'CLEAR_MERGES':
      return { ...state, merges: [] };
    default:
      return state;
  }
};

const Game2048 = () => {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialReducerState());
  const [skin, setSkin] = useState<keyof typeof SKINS>('classic');
  const [best, setBest] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hint, setHint] = useState<Direction | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouch = useRef<{ x: number; y: number; time: number } | null>(null);
  const { scores, addScore } = useOPFSLeaderboard('game_2048');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('game_2048_best_score');
      if (stored) setBest(parseInt(stored, 10));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('game_2048_best_score', best.toString());
    } catch {
      /* ignore */
    }
  }, [best]);

  useEffect(() => {
    startRecording(state.game);
  }, [state.runId]);

  useEffect(() => {
    if (state.lastDirection) {
      recordMove(state.lastDirection);
    }
  }, [state.lastDirection, state.moveToken]);

  useEffect(() => {
    if (state.merges.length) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_MERGES' }), 150);
      return () => clearTimeout(t);
    }
  }, [state.merges]);

  useEffect(() => {
    if (state.game.score > best) setBest(state.game.score);
  }, [state.game.score, best]);

  useEffect(() => {
    const ended = state.game.over || (state.game.won && !state.game.keepPlaying);
    if (ended && !submitted) {
      addScore(state.game.score);
      setSubmitted(true);
    }
    if (!ended && submitted) setSubmitted(false);
  }, [state.game.over, state.game.won, state.game.keepPlaying, state.game.score, addScore, submitted]);

  const move = useCallback(
    (dir: Direction) => {
      dispatch({ type: 'MOVE', direction: dir });
    },
    [dispatch],
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);

  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);

  const setBoardSize = (size: number) => dispatch({ type: 'SET_SIZE', size });

  const keepPlaying = () => dispatch({ type: 'KEEP_PLAYING' });

  const shareCard = useCallback(async () => {
    if (!boardRef.current) return;
    try {
      const url = await toPng(boardRef.current);
      const link = document.createElement('a');
      link.href = url;
      link.download = '2048-share.png';
      link.click();
    } catch {
      /* ignore errors */
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const time = performance.now();
    touchStart.current = { x: t.clientX, y: t.clientY, time };
    lastTouch.current = { x: t.clientX, y: t.clientY, time };
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    lastTouch.current = { x: t.clientX, y: t.clientY, time: performance.now() };
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const endTouch =
      lastTouch.current ?? {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: performance.now(),
      };
    const start = touchStart.current;
    const dx = endTouch.x - start.x;
    const dy = endTouch.y - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const distance = Math.max(absX, absY);
    const elapsed = Math.max(endTouch.time - start.time, 1);
    const velocity = distance / elapsed;
    if (distance >= 30 || velocity >= 0.45) {
      if (absX > absY) {
        move(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      } else {
        move(dy > 0 ? 'ArrowDown' : 'ArrowUp');
      }
    }
    touchStart.current = null;
    lastTouch.current = null;
    e.preventDefault();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: state.paused ? 'RESUME' : 'PAUSE' });
        return;
      }
      if (state.paused) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        move(e.key as Direction);
      }
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, undo, restart, state.paused]);

  const showHint = () => {
    const suggestion = findHint(state.game.board);
    if (suggestion) {
      setHint(suggestion);
      setTimeout(() => setHint(null), 800);
    }
  };

  const boardSize = state.game.size;
  const currentSkin = SKINS[skin];

  const boardStyle = useMemo<
    React.CSSProperties & Record<'--tile-size' | '--tile-gap', string>
  >(
    () => ({
      '--tile-size':
        boardSize === 5 ? 'clamp(2.5rem, 17vw, 4.75rem)' : 'clamp(3rem, 20vw, 5.5rem)',
      '--tile-gap': boardSize === 5 ? 'clamp(0.3rem, 1.5vw, 0.45rem)' : 'clamp(0.35rem, 1.7vw, 0.55rem)',
      gridTemplateColumns: `repeat(${boardSize}, var(--tile-size))`,
      gridAutoRows: 'var(--tile-size)',
      gap: 'var(--tile-gap)',
      justifyContent: 'center',
    }),
    [boardSize],
  );

  const gesturePadding = useMemo(
    () => (boardSize === 5 ? 'clamp(0.75rem, 7vw, 1.75rem)' : 'clamp(1rem, 9vw, 2.25rem)'),
    [boardSize],
  );

  const overlay = useMemo(() => {
    const showWin = state.game.won && !state.game.keepPlaying;
    if (!showWin && !state.game.over) return null;
    return (
      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded space-y-4 text-center shadow-lg">
          <div className="text-2xl font-bold">{showWin ? 'You reached 2048!' : 'Game over'}</div>
          <div className="flex space-x-3 justify-center">
            {showWin && (
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
                onClick={keepPlaying}
              >
                Keep going
              </button>
            )}
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={restart}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }, [keepPlaying, restart, state.game.keepPlaying, state.game.over, state.game.won]);

  return (
    <GameShell
      game="2048"
      settings={
        <div className="p-4 space-y-2">
          <label className="flex items-center space-x-2">
            <span>Board</span>
            <select
              className="text-black px-1 rounded"
              value={boardSize}
              onChange={(e) => setBoardSize(parseInt(e.target.value, 10))}
            >
              <option value={4}>4x4</option>
              <option value={5}>5x5</option>
            </select>
          </label>
        </div>
      }
      onPause={() => dispatch({ type: 'PAUSE' })}
      onResume={() => dispatch({ type: 'RESUME' })}
    >
      <div
        ref={boardRef}
        className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4 relative"
      >
        <div className="flex space-x-2 items-center">
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={restart}>
            Restart
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={undo}
            disabled={!state.history.length || state.undosLeft === 0}
          >
            Undo ({state.undosLeft})
          </button>
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={downloadReplay}
          >
            Download
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={shareCard}>
            Share Card
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={showHint}>
            Hint
          </button>
          <select
            className="text-black px-1 rounded"
            value={skin}
            onChange={(e) => setSkin(e.target.value as any)}
          >
            {Object.keys(SKINS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <div className="ml-auto flex space-x-2">
            <div className="bg-gray-800 text-white px-2 py-1 rounded text-sm">Score: {state.game.score}</div>
            <div className="bg-gray-800 text-white px-2 py-1 rounded text-sm">Best: {best}</div>
          </div>
        </div>
        <div
          className="relative flex-1 w-full touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ padding: gesturePadding }}
        >
          <div className="grid mx-auto" style={boardStyle}>
            {state.game.board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="transition-transform duration-[120ms] will-change-transform"
                >
                  <div
                    className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded transition-transform duration-[150ms] will-change-transform ${
                      cell ? currentSkin[cell] || 'bg-gray-700' : 'bg-gray-800'
                    } ${
                      state.merges.some(([r, c]) => r === rIdx && c === cIdx) ? 'scale-125' : ''
                    }`}
                  >
                    {cell || ''}
                  </div>
                </div>
              )),
            )}
          </div>
          {overlay}
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-400">Use arrow keys or swipe. U=Undo, R=Restart, Esc=Pause.</div>
          {hint && <div className="text-sm text-amber-300">Hint: {hint.replace('Arrow', '')}</div>}
          <div className="text-sm text-gray-400 ml-auto">
            Highest tile: {highestTile(state.game.board)}
          </div>
        </div>
        {scores.length > 0 && (
          <div className="mt-4 text-sm">
            <div className="font-bold">Leaderboard</div>
            <ol className="list-decimal list-inside space-y-1">
              {scores.map((s, i) => (
                <li key={i}>
                  {new Date(s.date).toLocaleDateString()}: {s.score}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default Game2048;
