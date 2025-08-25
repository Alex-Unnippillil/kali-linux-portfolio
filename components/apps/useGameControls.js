import { useEffect } from 'react';

/**
 * Hook to handle keyboard arrow keys and touch swipe gestures.
 * Calls the provided callback with a direction object: {x, y}.
 */
const useGameControls = (onDirection) => {
  // keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowUp') onDirection({ x: 0, y: -1 });
      if (e.key === 'ArrowDown') onDirection({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft') onDirection({ x: -1, y: 0 });
      if (e.key === 'ArrowRight') onDirection({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDirection]);

  // touch swipe controls
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const start = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const end = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) onDirection({ x: 1, y: 0 });
        else if (dx < -30) onDirection({ x: -1, y: 0 });
      } else {
        if (dy > 30) onDirection({ x: 0, y: 1 });
        else if (dy < -30) onDirection({ x: 0, y: -1 });
      }
    };

    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [onDirection]);
};

export default useGameControls;

