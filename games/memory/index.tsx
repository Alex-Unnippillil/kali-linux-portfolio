"use client";

import React, { useEffect, useMemo, useState } from 'react';
import GameShell from '../../components/games/GameShell';
import SizeSelector from './components/SizeSelector';
import { generateBoard } from './utils';
import {
  getLeaderboard,
  recordScore,
  type LeaderboardEntry,
} from '@/components/apps/Games/common/leaderboard';

const ATTACK_LIMIT = 60_000; // 60 seconds

/**
 * Simplified memory game used in the demos directory. The game focuses on
 * demonstrating grid size selection, dynamic board generation and an optional
 * timed attack mode rather than providing a full featured experience.
 */
const MemoryGame: React.FC = () => {
  const [size, setSize] = useState(4);
  const cards = useMemo(() => generateBoard(size), [size]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ATTACK_LIMIT);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    getLeaderboard('memory'),
  );

  // reset board when size or mode changes
  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    setStartTime(null);
    setElapsed(0);
    setCompleted(false);
    setTimeLeft(ATTACK_LIMIT);
  }, [size, attackMode]);

  // timer effect
  useEffect(() => {
    if (startTime === null) return;
    const id = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      setElapsed(diff);
      if (attackMode) {
        const remaining = ATTACK_LIMIT - diff;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setCompleted(true);
          setStartTime(null);
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [startTime, attackMode]);

  const handleClick = (idx: number) => {
    if (matched.has(idx) || flipped.includes(idx) || completed) return;
    if (startTime === null) setStartTime(Date.now());

    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
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

  // handle win
  useEffect(() => {
    if (!completed && matched.size === cards.length && cards.length > 0) {
      const final = elapsed;
      setCompleted(true);
      setStartTime(null);
      const name = window.prompt('Enter your name') || 'Anonymous';
      const board = recordScore('memory', name, -final);
      setLeaderboard(board);
    }
  }, [matched, cards.length, completed, elapsed]);

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
    >
      <div className="text-center mb-2">
        {attackMode
          ? `Time Left: ${(Math.max(timeLeft, 0) / 1000).toFixed(1)}s`
          : `Time: ${(elapsed / 1000).toFixed(1)}s`}
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
