import { useEffect, useRef } from 'react';
import { getMapping } from './Games/common/input-remap/useInputMapping';

/**
 * Multifunctional game control hook.
 *
 * If a callback is provided, arrow keys and swipe gestures will
 * invoke the callback with a direction object.
 * If a ref is provided, an object describing input state is returned.
 */
const defaultMap = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
  hyperspace: 'h',
};

const useGameControls = (arg, gameId = 'default') => {
  if (typeof arg === 'function') {
    const onDirection = arg;

    // keyboard controls
    useEffect(() => {
      const handleKey = (e) => {
        const map = getMapping(gameId, defaultMap);
        if (e.key === map.up) onDirection({ x: 0, y: -1 });
        if (e.key === map.down) onDirection({ x: 0, y: 1 });
        if (e.key === map.left) onDirection({ x: -1, y: 0 });
        if (e.key === map.right) onDirection({ x: 1, y: 0 });
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [onDirection, gameId]);

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

    return null;
  }

  // Advanced controls for games like Asteroids
  const canvasRef = arg;
  const stateRef = useRef({
    keys: {},
    fire: false,
    hyperspace: false,
    joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
  });

  useEffect(() => {
    const handleDown = (e) => {
      const map = getMapping(gameId, defaultMap);
      if (e.key === map.fire) stateRef.current.fire = true;
      else if (e.key === map.hyperspace) stateRef.current.hyperspace = true;
      else stateRef.current.keys[e.key] = true;
    };
    const handleUp = (e) => {
      const map = getMapping(gameId, defaultMap);
      if (e.key === map.fire) stateRef.current.fire = false;
      else if (e.key === map.hyperspace) stateRef.current.hyperspace = false;
      else stateRef.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [gameId]);

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return undefined;

    const rect = () => canvas.getBoundingClientRect();

    const start = (e) => {
      const touch = e.touches[0];
      const r = rect();
      if (touch.clientX - r.left < r.width / 2) {
        stateRef.current.joystick.active = true;
        stateRef.current.joystick.startX = touch.clientX;
        stateRef.current.joystick.startY = touch.clientY;
      } else {
        stateRef.current.fire = true;
      }
    };

    const move = (e) => {
      if (!stateRef.current.joystick.active) return;
      const touch = e.touches[0];
      const dx = (touch.clientX - stateRef.current.joystick.startX) / 40;
      const dy = (touch.clientY - stateRef.current.joystick.startY) / 40;
      stateRef.current.joystick.x = Math.max(-1, Math.min(1, dx));
      stateRef.current.joystick.y = Math.max(-1, Math.min(1, dy));
    };

    const end = () => {
      stateRef.current.joystick.active = false;
      stateRef.current.joystick.x = 0;
      stateRef.current.joystick.y = 0;
      stateRef.current.fire = false;
    };

    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [canvasRef]);

  return stateRef.current;
};

export default useGameControls;
