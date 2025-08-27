import { useState, useEffect, useCallback } from 'react';

export default function useGameInput() {
  const [pressed, setPressed] = useState(() => new Set());

  const down = useCallback((key) => {
    setPressed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const up = useCallback((key) => {
    setPressed((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleDown = (e) => down(e.code);
    const handleUp = (e) => up(e.code);
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [down, up]);

  return { pressed, down, up };
}
