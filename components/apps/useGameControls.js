import { useState, useEffect } from 'react';

const useGameControls = (cols, onDrop) => {
  const [selected, setSelected] = useState(Math.floor(cols / 2));

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        setSelected((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight') {
        setSelected((c) => Math.min(cols - 1, c + 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        onDrop(selected);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cols, onDrop, selected]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const handleStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx > 0) setSelected((c) => Math.min(cols - 1, c + 1));
        else setSelected((c) => Math.max(0, c - 1));
      } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        onDrop(selected);
      }
    };
    window.addEventListener('touchstart', handleStart);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [cols, onDrop, selected]);

  return [selected, setSelected];

};

export default useGameControls;

