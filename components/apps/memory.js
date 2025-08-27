import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createDeck } from './memory_utils';

const modes = [2, 4, 6];

const Memory = () => {
  const [size, setSize] = useState(4);
  const [timed, setTimed] = useState(false);
  const [assistive, setAssistive] = useState(false);
  const [practice, setPractice] = useState(false);
  const [seed, setSeed] = useState('');
  const [practiceStats, setPracticeStats] = useState({});
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stats, setStats] = useState({ games: 0, bestTime: null, bestMoves: null });
  const timerRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const key = useCallback(
      (s = size, t = timed) => `memory_${s}_${t ? 'timed' : 'casual'}`,
      [size, timed]
    );

    const reset = useCallback(
      (newSize = size, newSeed = seed, newPractice = practice) => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTime(0);
        setMoves(0);
        setFlipped([]);
        setMatched([]);
        setCards(
          createDeck(newSize, {
            seed: newSeed,
            practice: newPractice,
            practiceStats,
          })
        );
      },
      [size, seed, practice, practiceStats]
    );

    useEffect(() => {
      reset(size, seed, practice);
    }, [size, seed, practice, reset]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const stored = JSON.parse(localStorage.getItem('memory_practice_stats') || '{}');
      setPracticeStats(stored);
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const stored = JSON.parse(localStorage.getItem(key()) || '{}');
      setStats({
        games: stored.games || 0,
        bestTime: stored.bestTime ?? null,
        bestMoves: stored.bestMoves ?? null,
      });
    }, [key]);

  const startTimer = () => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
  };

    const saveStats = useCallback(() => {
      if (practice || typeof window === 'undefined') return;
      const current = JSON.parse(localStorage.getItem(key()) || '{}');
      const updated = {
        games: (current.games || 0) + 1,
        bestTime: timed
          ? current.bestTime
            ? Math.min(current.bestTime, time)
            : time
          : current.bestTime || null,
        bestMoves: !timed
          ? current.bestMoves
            ? Math.min(current.bestMoves, moves)
            : moves
          : current.bestMoves || null,
      };
      localStorage.setItem(key(), JSON.stringify(updated));
      setStats(updated);
    }, [timed, time, moves, key, practice]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
      const handler = () => setPrefersReducedMotion(media.matches);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
      if (cards.length && matched.length === cards.length) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        saveStats();
      }
    }, [matched, cards, saveStats]);

  const handleFlip = (idx) => {
    if (flipped.includes(idx) || matched.includes(idx)) return;

    if (flipped.length === 0) {
      startTimer();
      setFlipped([idx]);
    } else if (flipped.length === 1) {
      const first = flipped[0];
      const second = idx;
      const newFlipped = [first, second];
      setFlipped(newFlipped);
      setMoves((m) => m + 1);

      if (cards[first].value === cards[second].value) {
        setMatched([...matched, first, second]);
        if (practice) {
          const val = cards[first].value;
          const updated = {
            ...practiceStats,
            [val]: {
              success: (practiceStats[val]?.success || 0) + 1,
              fail: practiceStats[val]?.fail || 0,
            },
          };
          setPracticeStats(updated);
          localStorage.setItem('memory_practice_stats', JSON.stringify(updated));
        }
        setTimeout(() => setFlipped([]), prefersReducedMotion ? 0 : 600);
      } else {
        if (practice) {
          const firstVal = cards[first].value;
          const secondVal = cards[second].value;
          const updated = { ...practiceStats };
          updated[firstVal] = {
            success: practiceStats[firstVal]?.success || 0,
            fail: (practiceStats[firstVal]?.fail || 0) + 1,
          };
          updated[secondVal] = {
            success: practiceStats[secondVal]?.success || 0,
            fail: (practiceStats[secondVal]?.fail || 0) + 1,
          };
          setPracticeStats(updated);
          localStorage.setItem('memory_practice_stats', JSON.stringify(updated));
        }
        const delay = assistive ? 800 : 200;
        setTimeout(() => setFlipped([]), prefersReducedMotion ? 0 : delay);
      }
    }
  };

  const gridStyle = { gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2 flex flex-wrap items-center justify-center space-x-4">
        <label className="flex items-center">
          Size
          <select
            className="ml-1 text-black"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {modes.map((m) => (
              <option key={m} value={m}>{`${m}x${m}`}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) => {
              setTimed(e.target.checked);
              reset(size, seed, practice);
            }}
          />
          <span className="ml-1">Timed</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={assistive}
            onChange={(e) => setAssistive(e.target.checked)}
          />
          <span className="ml-1">Assistive</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={practice}
            onChange={(e) => setPractice(e.target.checked)}
          />
          <span className="ml-1">Practice</span>
        </label>
        <label className="flex items-center">
          Seed
          <input
            className="ml-1 text-black w-24"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="seed"
          />
        </label>
      </div>
      <div className="grid gap-2 mb-4" style={gridStyle}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx);
          return (
            <div key={card.id} className="aspect-square" onClick={() => handleFlip(idx)}>
              <div
                className={`relative w-full h-full transform-gpu ${
                  prefersReducedMotion ? '' : 'transition-transform duration-500'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute inset-0 bg-gray-700 rounded flex items-center justify-center text-2xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {card.value}
                </div>
                <div
                  className="absolute inset-0 bg-gray-600 rounded"
                  style={{ backfaceVisibility: 'hidden' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex space-x-4 mb-2">
        <div>Moves: {moves}</div>
        <div>Time: {time}s</div>
        {timed && stats.bestTime != null && <div>Best: {stats.bestTime}s</div>}
        {!timed && stats.bestMoves != null && <div>Best: {stats.bestMoves}</div>}
      </div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={() => reset(size, seed, practice)}
      >
        Reset
      </button>
    </div>
  );
};

export default Memory;
