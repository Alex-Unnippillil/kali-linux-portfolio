import { useEffect, useRef } from 'react';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import useGamepad from '../../hooks/useGamepad';

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
  const onDirection = typeof arg === 'function' ? arg : null;
  const canvasRef = typeof arg === 'function' ? null : arg;
  const stateRef = useRef({
    keys: {},
    fire: false,
    hyperspace: false,
    joystick: { x: 0, y: 0, active: false, startX: 0, startY: 0 },
  });
  const gamepad = useGamepad();
  const padTime = useRef(0);

  // keyboard controls for directional games
  useEffect(() => {
    if (!onDirection) return undefined;
    const handleKey = (e) => {
      const map = getMapping(gameId, defaultMap);
      if (e.key === map.up) onDirection({ x: 0, y: -1 });
      if (e.key === map.down) onDirection({ x: 0, y: 1 });
      if (e.key === map.left) onDirection({ x: -1, y: 0 });
      if (e.key === map.right) onDirection({ x: 1, y: 0 });
    };
    let timeout;
    const debounced = (e) => {
      if (e.repeat) return;
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = null;
      }, 100);
      handleKey(e);
    };
    window.addEventListener('keydown', debounced);
    return () => {
      window.removeEventListener('keydown', debounced);
      if (timeout) clearTimeout(timeout);
    };
  }, [onDirection, gameId]);

  // touch swipe controls for directional games
  useEffect(() => {
    if (!onDirection) return undefined;
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

  // gamepad controls for directional games
  useEffect(() => {
    if (!onDirection) return;
    const now = Date.now();
    if (now - padTime.current < 100) return;
    const { moveX, moveY } = gamepad;
    if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
      if (Math.abs(moveX) > Math.abs(moveY)) onDirection({ x: Math.sign(moveX), y: 0 });
      else onDirection({ x: 0, y: Math.sign(moveY) });
      padTime.current = now;
    }
  }, [gamepad, onDirection]);

  // keyboard controls for advanced games
  useEffect(() => {
    if (onDirection) return undefined;
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
  }, [gameId, onDirection]);

  // touch controls for advanced games
  useEffect(() => {
    if (onDirection || !canvasRef?.current) return undefined;
    const canvas = canvasRef.current;

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
  }, [canvasRef, onDirection]);

  // gamepad controls for advanced games
  useEffect(() => {
    if (onDirection) return;
    stateRef.current.joystick.x = gamepad.moveX;
    stateRef.current.joystick.y = gamepad.moveY;
    stateRef.current.fire = gamepad.fire || stateRef.current.fire;
  }, [gamepad, onDirection]);

  return onDirection ? null : stateRef.current;
};

export default useGameControls;
