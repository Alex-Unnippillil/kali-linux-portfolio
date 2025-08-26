import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createDeck } from './memory_utils';

const modes = [4, 6];

const Memory = () => {
  const [size, setSize] = useState(4);
  const [assistive, setAssistive] = useState(false);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [stats, setStats] = useState({ games: 0, bestTime: null });
  const [selected, setSelected] = useState(0);
  const timerRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const key = useCallback((s = size) => `memory_${s}`, [size]);

  const reset = useCallback(
    (newSize = size) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTime(0);
      setMoves(0);
      setFlipped([]);
      setMatched([]);
      setSelected(0);
      setCards(createDeck(newSize));
    },
    [size]
  );

  useEffect(() => {
    reset(size);
  }, [size, reset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = JSON.parse(localStorage.getItem(key()) || '{}');
    setStats({
      games: stored.games || 0,
      bestTime: stored.bestTime ?? null,
    });
  }, [key]);

  const startTimer = () => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
  };

  const saveStats = useCallback(() => {
    if (typeof window === 'undefined') return;
    const current = JSON.parse(localStorage.getItem(key()) || '{}');
    const updated = {
      games: (current.games || 0) + 1,
      bestTime:
        current.bestTime != null ? Math.min(current.bestTime, time) : time,
    };
    localStorage.setItem(key(), JSON.stringify(updated));
    setStats(updated);
  }, [time, key]);

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

  const handleFlip = useCallback(
    (idx) => {
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
          setTimeout(() => setFlipped([]), prefersReducedMotion ? 0 : 600);
        } else {
          const delay = assistive ? 800 : 200;
          setTimeout(
            () => setFlipped([]),
            prefersReducedMotion ? 0 : delay
          );
        }
      }
    },
    [flipped, matched, cards, assistive, prefersReducedMotion]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!cards.length) return;
      const total = cards.length;
      if (
        ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(
          e.key
        )
      ) {
        e.preventDefault();
      }
      if (e.key === 'ArrowRight') {
        setSelected((i) => (i + 1) % total);
      } else if (e.key === 'ArrowLeft') {
        setSelected((i) => (i - 1 + total) % total);
      } else if (e.key === 'ArrowDown') {
        setSelected((i) => (i + size) % total);
      } else if (e.key === 'ArrowUp') {
        setSelected((i) => (i - size + total) % total);
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleFlip(selected);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length, size, selected, handleFlip]);

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
            checked={assistive}
            onChange={(e) => setAssistive(e.target.checked)}
          />
          <span className="ml-1">Assistive</span>
        </label>
      </div>
      <div className="grid gap-2 mb-4" style={gridStyle}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx);
          const isSelected = selected === idx;
          return (
            <div
              key={card.id}
              className={`aspect-square ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
              onClick={() => handleFlip(idx)}
            >
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
        {stats.bestTime != null && <div>Best: {stats.bestTime}s</div>}
      </div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={() => reset(size)}
      >
        Reset
      </button>
    </div>
  );
};

export default Memory;

