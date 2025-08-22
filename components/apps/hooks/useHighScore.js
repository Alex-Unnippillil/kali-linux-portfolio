import { useState, useEffect } from 'react';

const useHighScore = (key) => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`${key}HighScore`) : null;
    if (stored) setHighScore(parseInt(stored, 10));
  }, [key]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${key}HighScore`, score.toString());
      }
    }
  }, [score, highScore, key]);

  const resetScore = () => setScore(0);

  return { score, setScore, highScore, resetScore };
};

export default useHighScore;
