'use client';
import { useEffect, useState } from 'react';

const KEY = 'game-score';

export function getHighScore(): number {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(KEY) || 0);
}

export function setHighScore(score: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(score));
}

export function useScore() {
  const [score, setScore] = useState(0);

  useEffect(() => {
    setScore(getHighScore());
  }, []);

  const update = (value: number) => {
    setScore(value);
    if (value > getHighScore()) setHighScore(value);
  };

  return { score, update };
}
