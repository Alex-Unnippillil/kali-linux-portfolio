import { useEffect, useRef } from 'react';

/**
 * Generic game control hook supporting both keyboard and touch input.
 *
 * When used with directional games it can be called with a callback:
 *   useGameControls((dir) => { ... });
 *
 * For more advanced games provide a canvas ref to enable virtual joystick
 * controls and read the returned control state:
 *   const controls = useGameControls(canvasRef);
 *
 * The returned state contains:
 *   { keys, joystick: {active, x, y}, fire, hyperspace }
 */
const useGameControls = (arg1, cb) => {
  const controls = useRef({
    keys: {},
    joystick: { active: false, x: 0, y: 0, sx: 0, sy: 0 },
    fire: false,
    hyperspace: false,
  });

  const canvasRef = arg1 && typeof arg1 === 'object' && 'current' in arg1 ? arg1 : null;
  const callback = typeof arg1 === 'function' ? arg1 : cb;

  // Keyboard controls
  useEffect(() => {
    const handleDown = (e) => {
      controls.current.keys[e.key] = true;
      if (e.key === ' ') controls.current.fire = true;
      if (e.key === 'Shift') controls.current.hyperspace = true;
      if (callback) {
        if (e.key === 'ArrowUp') callback({ x: 0, y: -1 });
        if (e.key === 'ArrowDown') callback({ x: 0, y: 1 });
        if (e.key === 'ArrowLeft') callback({ x: -1, y: 0 });
        if (e.key === 'ArrowRight') callback({ x: 1, y: 0 });
      }
    };
    const handleUp = (e) => {
      delete controls.current.keys[e.key];
      if (e.key === ' ') controls.current.fire = false;
      if (e.key === 'Shift') controls.current.hyperspace = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [callback]);

  // Touch controls / virtual joystick
  useEffect(() => {
    const target = canvasRef?.current || window;
    if (!target) return () => {};
    const joy = controls.current.joystick;
    const start = (e) => {
      if (e.touches.length === 1) {
        joy.active = true;
        joy.sx = e.touches[0].clientX;
        joy.sy = e.touches[0].clientY;
        joy.x = 0;
        joy.y = 0;
      } else if (e.touches.length > 1) {
        controls.current.fire = true;
      }
    };
    const move = (e) => {
      if (!joy.active) return;
      const t = e.touches[0];
      joy.x = Math.max(-1, Math.min(1, (t.clientX - joy.sx) / 40));
      joy.y = Math.max(-1, Math.min(1, (t.clientY - joy.sy) / 40));
      e.preventDefault();
    };
    const end = (e) => {
      if (e.touches.length === 0) {
        joy.active = false;
        joy.x = 0;
        joy.y = 0;
      }
    };
    target.addEventListener('touchstart', start, { passive: false });
    target.addEventListener('touchmove', move, { passive: false });
    target.addEventListener('touchend', end);
    return () => {
      target.removeEventListener('touchstart', start);
      target.removeEventListener('touchmove', move);
      target.removeEventListener('touchend', end);
    };
  }, [canvasRef]);

  return controls.current;
};

export default useGameControls;
