import { useRef, useEffect } from 'react';

const useGameControls = (canvasRef, onChange) => {
  const state = useRef({ up: false, down: false, touchY: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const notify = () => {
      if (onChange) onChange(state.current);
    };

    const keyDown = (e) => {
      if (e.key === 'ArrowUp') {
        state.current.up = true;
        notify();
      }
      if (e.key === 'ArrowDown') {
        state.current.down = true;
        notify();
      }
    };

    const keyUp = (e) => {
      if (e.key === 'ArrowUp') {
        state.current.up = false;
        notify();
      }
      if (e.key === 'ArrowDown') {
        state.current.down = false;
        notify();
      }
    };

    const handleTouch = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;
      state.current.touchY = touch.clientY - rect.top;
      notify();
      e.preventDefault();
    };

    const endTouch = () => {
      state.current.touchY = null;
      notify();
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', endTouch);
      canvas.removeEventListener('touchcancel', endTouch);
    };
  }, [canvasRef, onChange]);

  return state;
};

export default useGameControls;

