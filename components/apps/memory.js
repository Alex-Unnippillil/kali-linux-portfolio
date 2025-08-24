import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createDeck,
  THEME_PACKS,
  MATCH_PAUSE,
  FLIP_BACK_DELAY,
} from './memory_utils';

const LEVELS = [8, 12, 18, 24, 30];

const Memory = () => {
  const [pairs, setPairs] = useState(8);
  const [theme, setTheme] = useState('fruits');
  const [timed, setTimed] = useState(false);
  const [assistive, setAssistive] = useState(false);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [lastDeck, setLastDeck] = useState([]);
  const [stats, setStats] = useState({
    games: 0,
    bestTime: null,
    bestMoves: null,
    bestScore: null,
  });
  const timerRef = useRef(null);
  const cardRefs = useRef([]);
  const [announcement, setAnnouncement] = useState('');

  const key = useCallback(
    (p = pairs, t = timed, th = theme) =>
      `memory_${th}_${p}_${t ? 'timed' : 'casual'}`,
    [pairs, timed, theme]
  );

  const reset = useCallback(
    (newPairs = pairs, deck = null) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTime(0);
      setMoves(0);
      setFlipped([]);
      setMatched([]);
      setStreak(0);
      setScore(0);
      const newDeck = deck || createDeck(newPairs, theme);
      setCards(newDeck);
      setLastDeck(newDeck);
    },
    [pairs, theme]
  );

  const replay = () => reset(pairs, lastDeck);

  useEffect(() => {
    reset(pairs);
  }, [pairs, theme, reset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = JSON.parse(localStorage.getItem(key()) || '{}');
    setStats({
      games: stored.games || 0,
      bestTime: stored.bestTime ?? null,
      bestMoves: stored.bestMoves ?? null,
      bestScore: stored.bestScore ?? null,
    });
  }, [key]);

  const startTimer = () => {
    if (timed && !timerRef.current) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
  };

  const saveStats = useCallback(() => {
    if (typeof window === 'undefined') return;
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
      bestScore: current.bestScore ? Math.max(current.bestScore, score) : score,
    };
    localStorage.setItem(key(), JSON.stringify(updated));
    setStats(updated);
  }, [timed, time, moves, score, key]);

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
        const newStreak = streak + 1;
        setStreak(newStreak);
        setScore((s) => s + 10 * newStreak);
        setMatched([...matched, first, second]);
        setAnnouncement('Match found');
        setTimeout(() => setFlipped([]), MATCH_PAUSE);
      } else {
        setStreak(0);
        setAnnouncement('No match');
        setTimeout(() => setFlipped([]), assistive ? 800 : FLIP_BACK_DELAY);
      }
    }
  };

  const totalCards = cards.length || pairs * 2;
  const cols = Math.ceil(Math.sqrt(totalCards));
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  const handleKeyDown = (idx, e) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    let next = null;
    if (e.key === 'ArrowRight' && col < cols - 1) next = idx + 1;
    if (e.key === 'ArrowLeft' && col > 0) next = idx - 1;
    if (e.key === 'ArrowDown' && idx + cols < cards.length) next = idx + cols;
    if (e.key === 'ArrowUp' && idx - cols >= 0) next = idx - cols;
    if (next != null && cardRefs.current[next]) {
      e.preventDefault();
      cardRefs.current[next].focus();
    }
  };

  const frontClasses =
    theme === 'high-contrast'
      ? 'absolute inset-0 bg-black text-yellow-300 rounded flex items-center justify-center text-xl'
      : 'absolute inset-0 bg-gray-700 rounded flex items-center justify-center text-2xl';
  const backClasses =
    theme === 'high-contrast'
      ? 'absolute inset-0 bg-white rounded'
      : 'absolute inset-0 bg-gray-600 rounded';

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 select-none">
      <div className="mb-2 flex flex-wrap items-center justify-center space-x-4">
        <label className="flex items-center">
          Pairs
          <select
            className="ml-1 text-black"
            value={pairs}
            onChange={(e) => setPairs(Number(e.target.value))}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center">
          Theme
          <select
            className="ml-1 text-black"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            {Object.keys(THEME_PACKS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) => {
              setTimed(e.target.checked);
              reset(pairs);
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
      </div>
      {timed && <div className="mb-2">Time: {time}s</div>}
      <div className="grid gap-2 mb-4" style={gridStyle}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={card.id}
              className="aspect-square focus:outline-none"
              onClick={() => handleFlip(idx)}
              ref={(el) => (cardRefs.current[idx] = el)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Card ${idx + 1}`}
              aria-pressed={isFlipped}
              data-testid={`card-${idx}`}
            >
              <div
                className="relative w-full h-full transition-transform duration-500 ease-in-out transform-gpu"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className={frontClasses}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {typeof card.value === 'string' && card.value.startsWith('http') ? (
                    <img
                      src={card.value}
                      alt="card"
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    card.value
                  )}
                </div>
                <div className={backClasses} style={{ backfaceVisibility: 'hidden' }} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap space-x-4 mb-2 items-center justify-center">
        <div>Moves: {moves}</div>
        <div>Score: {score}</div>
        {streak > 1 && <div>Streak: {streak}</div>}
        {timed && stats.bestTime != null && <div>Best: {stats.bestTime}s</div>}
        {!timed && stats.bestMoves != null && <div>Best: {stats.bestMoves}</div>}
        {stats.bestScore != null && <div>High Score: {stats.bestScore}</div>}
      </div>
      <div className="space-x-2">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => reset(pairs)}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={replay}
        >
          Replay
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default Memory;

