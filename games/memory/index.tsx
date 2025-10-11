"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import SizeSelector from './components/SizeSelector';
import { generateBoard } from './utils';
import {
  getLeaderboard,
  recordScore,
  type LeaderboardEntry,
} from '../../components/apps/Games/common/leaderboard';
import {
  MemoryControls,
  getMemoryScore,
  recordMemoryScore,
  type MemoryModeDescriptor,
  type MemoryScore,
} from '../../apps/memory';

const ATTACK_LIMIT = 60_000; // 60 seconds

/**
 * Simplified memory game used in the demos directory. The game focuses on
 * demonstrating grid size selection, dynamic board generation and an optional
 * timed attack mode rather than providing a full featured experience.
 */
const MemoryGame: React.FC = () => {
  const [size, setSize] = useState(4);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ATTACK_LIMIT);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    getLeaderboard('memory'),
  );
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(0);
  const [best, setBest] = useState<MemoryScore | null>(null);

  const startRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  const descriptor: MemoryModeDescriptor = useMemo(
    () => ({
      variant: 'demo',
      player: 0,
      size,
      timerMode: attackMode ? 'countdown' : 'countup',
      deckType: 'letters',
    }),
    [size, attackMode],
  );

  const cards = useMemo(() => generateBoard(size), [size, seed]);

  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setElapsed(0);
    setCompleted(false);
    setTimeLeft(ATTACK_LIMIT);
    setPaused(false);
    accumulatedRef.current = 0;
    startRef.current = null;
  }, [size, attackMode, seed]);

  useEffect(() => {
    if (startRef.current === null || paused || completed) return;
    const id = setInterval(() => {
      const now = Date.now();
      const diff = accumulatedRef.current + (now - (startRef.current ?? now));
      setElapsed(diff);
      if (attackMode) {
        const remaining = ATTACK_LIMIT - diff;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setCompleted(true);
          startRef.current = null;
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [attackMode, paused, completed]);

  useEffect(() => {
    setBest(getMemoryScore(descriptor));
  }, [descriptor]);

  const handlePause = useCallback(() => {
    setPaused(true);
    if (startRef.current !== null) {
      accumulatedRef.current += Date.now() - startRef.current;
      setElapsed(accumulatedRef.current);
      startRef.current = null;
    }
  }, []);

  const handleResume = useCallback(() => {
    if (completed) return;
    setPaused(false);
    if (startRef.current === null && flipped.length > 0 && matched.size < cards.length) {
      startRef.current = Date.now();
    }
  }, [cards.length, completed, flipped.length, matched.size]);

  const resetGame = useCallback(() => {
    setSeed((s) => s + 1);
  }, []);

  const handleClick = (idx: number) => {
    if (matched.has(idx) || flipped.includes(idx) || completed || paused) return;
    if (startRef.current === null) {
      startRef.current = Date.now();
    }

    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a] === cards[b]) {
        setTimeout(() => {
          setMatched(new Set([...matched, a, b]));
          setFlipped([]);
        }, 500);
      } else {
        setTimeout(() => setFlipped([]), 500);
      }
    }
  };

  useEffect(() => {
    if (!completed && matched.size === cards.length && cards.length > 0) {
      const final = elapsed;
      setCompleted(true);
      startRef.current = null;
      const name = window.prompt('Enter your name') || 'Anonymous';
      const board = recordScore('memory', name, -final);
      setLeaderboard(board);
      const recorded = recordMemoryScore(descriptor, {
        moves,
        time: final / 1000,
      });
      setBest(recorded);
    }
  }, [matched, cards.length, completed, elapsed, descriptor, moves]);

  const infoText = attackMode
    ? `Time Left: ${(Math.max(timeLeft, 0) / 1000).toFixed(1)}s`
    : `Time: ${(elapsed / 1000).toFixed(1)}s`;

  return (
    <GameShell
      game="memory"
      settings={
        <div className="flex items-center space-x-4">
          <SizeSelector value={size} onChange={setSize} />
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={attackMode}
              onChange={(e) => setAttackMode(e.target.checked)}
            />
            <span className="text-sm">Timed Attack</span>
          </label>
        </div>
      }
      onPause={handlePause}
      onResume={handleResume}
    >
      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="text-center">{infoText}</div>
        <div className="text-sm text-center">Moves: {moves}</div>
        {best && (
          <div className="text-xs text-center text-gray-300">
            Best: {best.moves} moves / {best.time.toFixed(1)}s
          </div>
        )}
        <MemoryControls
          paused={paused}
          onTogglePause={() => (paused ? handleResume() : handlePause())}
          onReset={resetGame}
          muted={false}
          onToggleSound={() => {}}
          labelPrefix="Demo"
        />
      </div>
      <div
        className="grid gap-2 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`,
          width: `${size * 80}px`,
        }}
      >
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={`h-20 w-20 flex items-center justify-center rounded text-lg font-bold ${
                isFlipped
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-700'
              }`}
            >
              {isFlipped ? card : '?'}
            </button>
          );
        })}
      </div>
      {completed && (
        matched.size === cards.length ? (
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2 text-center">Leaderboard</h3>
            <ol className="list-decimal list-inside">
              {leaderboard.map((entry, i) => (
                <li key={i}>
                  {entry.name}: {(Math.abs(entry.score) / 1000).toFixed(1)}s
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="mt-4 text-center text-lg font-bold">Time&apos;s up!</div>
        )
      )}
    </GameShell>
  );
};

export default MemoryGame;

