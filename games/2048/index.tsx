"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import { toPng } from 'html-to-image';
import useOPFSLeaderboard from '../../hooks/useOPFSLeaderboard';
import {
  Board,
  SIZE,
  setSize,
  addRandomTile,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
  cloneBoard,
} from '../../apps/games/_2048/logic';
import { reset, serialize, deserialize } from '../../apps/games/rng';
import Modal from '../../components/base/Modal';
import { startRecording, recordMove, undoRecord, downloadReplay } from './replay';

// limit of undo operations per game
const UNDO_LIMIT = 5;

// tile skins
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

type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
type UndoState = { board: Board; rng: string; score: number } | null;
type ReplaySession = {
  seed: string;
  size: number;
  start: { board: Board; rng: string };
  moves: Direction[];
};
type GameHistoryEntry = ReplaySession & {
  undo: UndoState;
  completed: boolean;
};

const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const createSeed = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0].toString(16);
  }
  return Math.random().toString(36).slice(2);
};

const highestTile = (b: Board) => Math.max(...b.flat());

const Game2048 = () => {
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [replayOpen, setReplayOpen] = useState(false);
  const [activeReplay, setActiveReplay] = useState<ReplaySession | null>(null);
  const [replayBoard, setReplayBoard] = useState<Board>(emptyBoard());
  const [replayStep, setReplayStep] = useState(0);
  const [undosLeft, setUndosLeft] = useState(UNDO_LIMIT);
  const [skin, setSkin] = useState<keyof typeof SKINS>('classic');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [boardSize, setBoardSize] = useState(4);
  const [merged, setMerged] = useState<Array<[number, number]>>([]);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scores, addScore } = useOPFSLeaderboard('game_2048');

  // load best score from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('game_2048_best_score');
      if (stored) setBest(parseInt(stored, 10));
    } catch {
      /* ignore */
    }
  }, []);

  // persist best score
  useEffect(() => {
    try {
      window.localStorage.setItem('game_2048_best_score', best.toString());
    } catch {
      /* ignore */
    }
  }, [best]);

  const init = useCallback(() => {
    const seed = createSeed();
    reset(seed);
    setSize(boardSize);
    const base = emptyBoard();
    addRandomTile(base);
    addRandomTile(base);
    const initialBoard = cloneBoard(base);
    const rngState = serialize();
    setBoard(initialBoard);
    setScore(0);
    setUndosLeft(UNDO_LIMIT);
    setWon(false);
    setLost(false);
    setMerged([]);
    setReplayOpen(false);
    setActiveReplay(null);
    setReplayBoard(emptyBoard());
    setReplayStep(0);
    setHistory((prev) => {
      if (!prev.length) {
        return [
          {
            seed,
            size: boardSize,
            start: { board: cloneBoard(initialBoard), rng: rngState },
            moves: [],
            undo: null,
            completed: false,
          },
        ];
      }
      const previous = prev[prev.length - 1];
      const completedPrev =
        previous && !previous.completed
          ? [
              ...prev.slice(0, -1),
              { ...previous, completed: true },
            ]
          : prev;
      return [
        ...completedPrev,
        {
          seed,
          size: boardSize,
          start: { board: cloneBoard(initialBoard), rng: rngState },
          moves: [],
          undo: null,
          completed: false,
        },
      ];
    });
    startRecording(initialBoard, rngState, seed);
  }, [boardSize]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!won && !lost) return;
    setHistory((h) => {
      if (!h.length) return h;
      const idx = h.length - 1;
      const entry = h[idx];
      if (!entry || entry.completed) return h;
      const next = [...h];
      next[idx] = { ...entry, completed: true };
      return next;
    });
  }, [won, lost]);
  // check if moves available
  const hMoves = (b: Board) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) return true;
        if (c < SIZE - 1 && b[r][c] === b[r][c + 1]) return true;
        if (r < SIZE - 1 && b[r][c] === b[r + 1][c]) return true;
      }
    }
    return false;
  };

  const move = useCallback(
    (dir: Direction) => {
      if (won || lost || paused) return;
      const fn =
        dir === 'ArrowLeft'
          ? moveLeft
          : dir === 'ArrowRight'
          ? moveRight
          : dir === 'ArrowUp'
          ? moveUp
          : moveDown;
      const { board: moved, score: gained, merges } = fn(
        board.map((row) => [...row])
      );
      if (boardsEqual(board, moved)) return;
      const previousBoard = cloneBoard(board);
      const rngState = serialize();
      setHistory((h) => {
        if (!h.length) return h;
        const next = [...h];
        const current = next[next.length - 1];
        if (!current) return h;
        next[next.length - 1] = {
          ...current,
          undo: { board: previousBoard, rng: rngState, score },
          moves: [...current.moves, dir],
        };
        return next;
      });
      recordMove(dir);
      addRandomTile(moved);
      const hi = highestTile(moved);
      setScore((s) => {
        const newScore = s + gained;
        if (newScore > best) setBest(newScore);
        return newScore;
      });
      setBoard(moved);
      setMerged(merges);
      if (hi >= 2048) setWon(true);
      else if (!hMoves(moved)) setLost(true);
    },
    [board, best, won, lost, score, paused]
  );

  const undo = useCallback(() => {
    if (paused || undosLeft === 0) return;
    const current = history[history.length - 1];
    if (!current?.undo) return;
    const { board: prevBoard, rng, score: prevScore } = current.undo;
    deserialize(rng);
    setBoard(cloneBoard(prevBoard));
    setHistory((h) => {
      if (!h.length) return h;
      const next = [...h];
      const entry = next[next.length - 1];
      if (!entry?.undo) return h;
      next[next.length - 1] = {
        ...entry,
        undo: null,
        moves: entry.moves.slice(0, -1),
      };
      return next;
    });
    undoRecord();
    setUndosLeft((u) => u - 1);
    setScore(prevScore);
    setMerged([]);
    setWon(false);
    setLost(false);
  }, [history, undosLeft, paused]);

  // keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused) return;
      if ([
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(e.key)) {
        e.preventDefault();
        move(e.key as any);
      }
      if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undo();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        init();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, undo, init, paused]);

  // touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || paused) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 30) return;
    if (absX > absY) {
      move(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      move(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    }
    touchStart.current = null;
  };

  // record score when game ends
  useEffect(() => {
    if ((won || lost) && !submitted) {
      addScore(score);
      setSubmitted(true);
    }
    if (!won && !lost && submitted) setSubmitted(false);
  }, [won, lost, score, addScore, submitted]);

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

  const currentSkin = SKINS[skin];

  const lastReplayableGame = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const entry = history[i];
      if (!entry) continue;
      if (entry.moves.length === 0) continue;
      if (entry.completed || i < history.length - 1) return entry;
    }
    return null;
  }, [history]);

  const canUndo = !!history[history.length - 1]?.undo && undosLeft > 0;

  useEffect(() => {
    if (!replayOpen || !activeReplay) return;
    let cancelled = false;
    const prevSize = SIZE;
    const prevRngState = serialize();
    setSize(activeReplay.size);
    deserialize(activeReplay.start.rng);
    let boardState = cloneBoard(activeReplay.start.board);
    setReplayBoard(cloneBoard(activeReplay.start.board));
    setReplayStep(0);

    const schedule = (index: number) => {
      if (cancelled || index >= activeReplay.moves.length) {
        setReplayStep((step) => Math.max(step, activeReplay.moves.length));
        return;
      }
      replayTimer.current = window.setTimeout(() => {
        if (cancelled) return;
        const dir = activeReplay.moves[index];
        const fn =
          dir === 'ArrowLeft'
            ? moveLeft
            : dir === 'ArrowRight'
            ? moveRight
            : dir === 'ArrowUp'
            ? moveUp
            : moveDown;
        const { board: moved } = fn(cloneBoard(boardState));
        if (!boardsEqual(boardState, moved)) {
          boardState = moved;
          addRandomTile(boardState);
        }
        const nextIndex = index + 1;
        setReplayBoard(cloneBoard(boardState));
        setReplayStep(nextIndex);
        schedule(nextIndex);
      }, 400);
    };

    schedule(0);

    return () => {
      cancelled = true;
      if (replayTimer.current) {
        clearTimeout(replayTimer.current);
        replayTimer.current = null;
      }
      deserialize(prevRngState);
      setSize(prevSize);
    };
  }, [replayOpen, activeReplay]);

  const openReplay = useCallback(() => {
    if (!lastReplayableGame) return;
    setActiveReplay({
      seed: lastReplayableGame.seed,
      size: lastReplayableGame.size,
      start: {
        board: cloneBoard(lastReplayableGame.start.board),
        rng: lastReplayableGame.start.rng,
      },
      moves: [...lastReplayableGame.moves],
    });
    setReplayBoard(cloneBoard(lastReplayableGame.start.board));
    setReplayStep(0);
    setReplayOpen(true);
  }, [lastReplayableGame]);

  const closeReplay = useCallback(() => {
    setReplayOpen(false);
    setActiveReplay(null);
    setReplayStep(0);
  }, []);

  useEffect(() => {
    if (merged.length) {
      const t = setTimeout(() => setMerged([]), 150);
      return () => clearTimeout(t);
    }
  }, [merged]);

  const settings = (
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
  );

  return (
    <>
      <GameShell
        game="2048"
        settings={settings}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
      >
        <div
          ref={boardRef}
          className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4"
        >
          <div className="flex space-x-2 items-center">
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={init}
            >
              Restart
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={undo}
              disabled={!canUndo}
            >
              Undo ({undosLeft})
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={downloadReplay}
            >
              Download
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={openReplay}
              disabled={!lastReplayableGame}
            >
              Replay
            </button>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={shareCard}
            >
              Share Card
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
              <div className="bg-gray-800 text-white px-2 py-1 rounded text-sm">
                Score: {score}
              </div>
              <div className="bg-gray-800 text-white px-2 py-1 rounded text-sm">
                Best: {best}
              </div>
            </div>
          </div>
          <div
            data-testid="game-board"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`grid w-full max-w-sm ${
              boardSize === 5 ? 'grid-cols-5' : 'grid-cols-4'
            } gap-1.5`}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="w-full aspect-square transition-transform duration-[120ms]"
                >
                  <div
                    className={`h-full w-full flex items-center justify-center text-2xl font-bold rounded transition-transform duration-[150ms] ${
                      cell ? currentSkin[cell] || 'bg-gray-700' : 'bg-gray-800'
                    } ${
                      merged.some(([r, c]) => r === rIdx && c === cIdx)
                        ? 'scale-125'
                        : ''
                    }`}
                  >
                    {cell || ''}
                  </div>
                </div>
              ))
            )}
          </div>
          {(won || lost) && (
            <div className="mt-4 text-xl">{won ? 'You win!' : 'Game over'}</div>
          )}
          <div className="text-sm text-gray-400">
            Use arrow keys or swipe. U=Undo, R=Restart, Esc=Pause.
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
      <Modal isOpen={replayOpen} onClose={closeReplay}>
        <div className="bg-gray-900 text-white p-4 rounded space-y-4 w-[min(90vw,22rem)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Last Game Replay</h2>
            <button
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              onClick={closeReplay}
            >
              Close
            </button>
          </div>
          {activeReplay ? (
            <>
              <div
                data-testid="replay-board"
                className={`grid ${
                  activeReplay.size === 5 ? 'grid-cols-5' : 'grid-cols-4'
                } gap-1.5`}
              >
                {replayBoard.map((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div key={`replay-${rIdx}-${cIdx}`} className="w-full aspect-square">
                      <div
                        className={`h-full w-full flex items-center justify-center text-xl font-bold rounded ${
                          cell ? currentSkin[cell] || 'bg-gray-700' : 'bg-gray-800'
                        }`}
                      >
                        {cell || ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="text-sm text-gray-400">
                Seed:{' '}
                <code className="break-all text-xs">{activeReplay.seed}</code>
              </div>
              <div className="text-sm text-gray-400">
                Move {Math.min(replayStep, activeReplay.moves.length)} /{' '}
                {activeReplay.moves.length}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No replay available.</p>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Game2048;

