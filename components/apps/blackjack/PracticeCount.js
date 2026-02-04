import React, { useCallback, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { Shoe } from './engine';

const getHiLoDelta = (card) => {
  if (!card) return 0;
  if (['2', '3', '4', '5', '6'].includes(card.value)) return 1;
  if (['10', 'J', 'Q', 'K', 'A'].includes(card.value)) return -1;
  return 0;
};

const getDeltaLabel = (delta) => {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
};

const PracticeCount = ({
  onExit,
  showExit = true,
  showNewShoe = true,
  streakStorageKey = 'bj_best_streak',
  revealStorageKey = 'bj_reveal_count',
  className = '',
  title = 'Practice Count',
  onBestStreakChange,
}) => {
  const shoeRef = useRef(new Shoe(1));
  const [card, setCard] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = usePersistentState(
    streakStorageKey,
    0,
    (v) => typeof v === 'number',
  );
  const [revealEnabled, setRevealEnabled] = usePersistentState(
    revealStorageKey,
    false,
    (v) => typeof v === 'boolean',
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [runningCount, setRunningCount] = useState(shoeRef.current.runningCount);
  const [composition, setComposition] = useState({ ...shoeRef.current.composition });
  const revealTimeoutRef = useRef(null);

  const drawCard = useCallback(() => {
    setCard(shoeRef.current.draw());
    setRunningCount(shoeRef.current.runningCount);
    setComposition({ ...shoeRef.current.composition });
  }, []);

  const resetShoe = useCallback(() => {
    shoeRef.current.shuffle();
    setStreak(0);
    setFeedback('');
    setShowAnswer(false);
    setAnswer(null);
    drawCard();
  }, [drawCard]);

  const scheduleNextCard = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    revealTimeoutRef.current = setTimeout(() => {
      setShowAnswer(false);
      setAnswer(null);
      setFeedback('');
      drawCard();
    }, 1200);
  }, [drawCard]);

  useEffect(() => {
    drawCard();
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, [drawCard]);

  useEffect(() => {
    if (onBestStreakChange) {
      onBestStreakChange(bestStreak);
    }
  }, [bestStreak, onBestStreakChange]);

  const submitGuess = useCallback(() => {
    if (!card) return;
    const parsedGuess = parseInt(guess, 10);
    const actual = shoeRef.current.runningCount;
    const delta = getHiLoDelta(card);
    const correct = parsedGuess === actual;
    if (correct) {
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => (next > best ? next : best));
        return next;
      });
      setFeedback(`Correct! Count is ${actual}.`);
    } else {
      setStreak(0);
      setFeedback(`Not quite. Count is ${actual}.`);
    }
    setGuess('');
    setAnswer({
      actual,
      delta,
      cardLabel: `${card.value}${card.suit}`,
    });
    setShowAnswer(true);
    scheduleNextCard();
  }, [card, guess, scheduleNextCard, setBestStreak]);

  const shouldReveal = revealEnabled || showAnswer;

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-4 bg-[color:color-mix(in_srgb,var(--color-surface)_65%,transparent)] p-4 text-kali-text select-none ${className}`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-kali-control">{title}</div>
      {card && <div className="text-4xl">{`${card.value}${card.suit}`}</div>}
      <input
        type="number"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        className="w-28 rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-2 py-1 text-center text-kali-text transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        aria-label="Enter running count guess"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="rounded bg-kali-muted px-3 py-1 text-sm font-medium text-kali-text transition-colors hover:bg-kali-primary hover:text-kali-inverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-50"
          onClick={submitGuess}
          disabled={guess.trim() === ''}
        >
          Submit
        </button>
        {showNewShoe && (
          <button
            type="button"
            className="rounded bg-kali-muted px-3 py-1 text-sm font-medium text-kali-text transition-colors hover:bg-kali-primary hover:text-kali-inverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            onClick={resetShoe}
          >
            New Shoe
          </button>
        )}
        {showExit && (
          <button
            type="button"
            className="rounded bg-kali-muted px-3 py-1 text-sm font-medium text-kali-text transition-colors hover:bg-kali-primary hover:text-kali-inverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            onClick={onExit}
          >
            Exit
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-kali-control">
        <input
          type="checkbox"
          checked={revealEnabled}
          onChange={(e) => setRevealEnabled(e.target.checked)}
          aria-label="Reveal running count"
        />
        Reveal count
      </label>
      {feedback && (
        <div className="text-center text-sm" aria-live="polite">
          {feedback}
        </div>
      )}
      {showAnswer && answer && (
        <div className="text-center text-xs text-kali-text">
          Hi-Lo impact for {answer.cardLabel}: {getDeltaLabel(answer.delta)} (2-6:+1, 7-9:0, 10-A:-1)
        </div>
      )}
      <div className="text-sm sm:text-base">Streak: {streak}</div>
      <div className="text-sm sm:text-base">Best: {bestStreak}</div>
      {shouldReveal ? (
        <>
          <div className="text-sm sm:text-base">RC: {runningCount}</div>
          <div className="text-center text-xs sm:text-sm">
            {Object.entries(composition)
              .map(([value, count]) => `${value}:${count}`)
              .join(' ')}
          </div>
        </>
      ) : (
        <div className="text-xs text-kali-muted">Count hidden until you submit.</div>
      )}
    </div>
  );
};

export default PracticeCount;
