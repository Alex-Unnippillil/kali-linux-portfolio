import { useEffect, useState } from 'react';

/**
 * Game input helper.
 *
 * Two modes are supported:
 *   1. Directional mode – `useGameControls(cb)` where `cb` receives
 *      `{x, y}` for arrow key or swipe gestures.
 *   2. Column selection mode – `useGameControls(cols, onSelect)` used by
 *      grid based games such as Connect Four. Returns `[selected, setSelected]`
 *      and handles left/right movement as well as Enter/Space to confirm.
 */
const useGameControls = (arg1, arg2) => {
  // --- directional mode -------------------------------------------------
  if (typeof arg1 === 'function') {
    const onDirection = arg1;

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

    return;
  }

  // --- column selection mode -------------------------------------------
  const cols = arg1;
  const onSelect = arg2;
  const [selected, setSelected] = useState(Math.floor(cols / 2));

  // keyboard left/right to move, enter/space to confirm
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft')
        setSelected((s) => Math.max(0, s - 1));
      if (e.key === 'ArrowRight')
        setSelected((s) => Math.min(cols - 1, s + 1));
      if (e.key === 'Enter' || e.key === ' ')
        onSelect(selected);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cols, onSelect, selected]);

  // touch swipe left/right to move
  useEffect(() => {
    let startX = 0;

    const start = (e) => {
      startX = e.touches[0].clientX;
    };

    const end = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 30) setSelected((s) => Math.min(cols - 1, s + 1));
      else if (dx < -30) setSelected((s) => Math.max(0, s - 1));
    };

    window.addEventListener('touchstart', start);
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [cols]);

  return [selected, setSelected];
};

export default useGameControls;

