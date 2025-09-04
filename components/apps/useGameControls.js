import { useEffect, useRef, useState, useCallback } from 'react';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import useGamepad from '../../hooks/useGamepad';
import usePersistedState from '../../hooks/usePersistedState';

/**
 * Multifunctional game control hook.
 *
 * If a callback is provided, arrow keys and swipe gestures will
 * invoke the callback with a direction object.
 * If a ref is provided, an object describing input state is returned.
 */
const defaultMap = {
  up: { key: 'ArrowUp', pad: 12 },
  down: { key: 'ArrowDown', pad: 13 },
  left: { key: 'ArrowLeft', pad: 14 },
  right: { key: 'ArrowRight', pad: 15 },
  fire: { key: ' ', pad: 0 },
  hyperspace: { key: 'h', pad: 3 },
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
  const map = getMapping(gameId, defaultMap);
  const fireButton = map.fire?.pad;
  const gamepad = useGamepad(0.25, fireButton !== undefined ? [fireButton] : undefined);
  const padTime = useRef(0);

  // keyboard controls for directional games
  useEffect(() => {
    if (!onDirection) return undefined;
    const handleKey = (e) => {
      const map = getMapping(gameId, defaultMap);
      if (e.key === map.up.key) onDirection({ x: 0, y: -1 });
      if (e.key === map.down.key) onDirection({ x: 0, y: 1 });
      if (e.key === map.left.key) onDirection({ x: -1, y: 0 });
      if (e.key === map.right.key) onDirection({ x: 1, y: 0 });
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
      if (e.key === map.fire.key) stateRef.current.fire = true;
      else if (e.key === map.hyperspace.key) stateRef.current.hyperspace = true;
      else stateRef.current.keys[e.key] = true;
    };
    const handleUp = (e) => {
      const map = getMapping(gameId, defaultMap);
      if (e.key === map.fire.key) stateRef.current.fire = false;
      else if (e.key === map.hyperspace.key) stateRef.current.hyperspace = false;
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
      } else if (touch.clientY - r.top < r.height / 2) {
        stateRef.current.fire = true;
      } else {
        stateRef.current.hyperspace = true;
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
      stateRef.current.hyperspace = false;
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
    if (map.fire?.pad !== undefined)
      stateRef.current.fire = gamepad.buttons[map.fire.pad] || stateRef.current.fire;
    if (map.hyperspace?.pad !== undefined)
      stateRef.current.hyperspace =
        gamepad.buttons[map.hyperspace.pad] || stateRef.current.hyperspace;
  }, [gamepad, onDirection, map]);

  return onDirection ? null : stateRef.current;
};

export const useGameSettings = (gameId = 'default') => {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeedRaw] = usePersistedState(`game:${gameId}:speed`, 1);
  const [muted, setMuted] = usePersistedState(`game:${gameId}:muted`, false);
  const [screenShake, setScreenShake] = usePersistedState(`game:${gameId}:shake`, true);
  const [palette, setPalette] = usePersistedState(`game:${gameId}:palette`, 'normal');

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const toggleMute = useCallback(() => setMuted((m) => !m), [setMuted]);
  const setSpeed = useCallback(
    (v) => setSpeedRaw(Math.min(2, Math.max(0.5, v))),
    [setSpeedRaw],
  );

  return {
    paused,
    togglePause,
    speed,
    setSpeed,
    muted,
    toggleMute,
    screenShake,
    setScreenShake,
    palette,
    setPalette,
  };
};

export const useGamePersistence = (gameId = 'default') => {
  const saveSnapshot = useCallback(
    (data) => {
      try {
        localStorage.setItem(`snapshot:${gameId}`, JSON.stringify(data));
      } catch {
        /* ignore */
      }
    },
    [gameId],
  );

  const loadSnapshot = useCallback(() => {
    try {
      const raw = localStorage.getItem(`snapshot:${gameId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [gameId]);

  const getHighScore = useCallback(() => {
    try {
      return Number(localStorage.getItem(`highscore:${gameId}`)) || 0;
    } catch {
      return 0;
    }
  }, [gameId]);

  const setHighScore = useCallback(
    (score) => {
      try {
        const current = getHighScore();
        if (score > current)
          localStorage.setItem(`highscore:${gameId}`, String(score));
      } catch {
        /* ignore */
      }
    },
    [gameId, getHighScore],
  );

  const getAchievements = useCallback(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(`achievements:${gameId}`)) || []
      );
    } catch {
      return [];
    }
  }, [gameId]);

  const unlockAchievement = useCallback(
    (id) => {
      try {
        const list = getAchievements();
        if (!list.includes(id)) {
          list.push(id);
          localStorage.setItem(
            `achievements:${gameId}`,
            JSON.stringify(list),
          );
        }
      } catch {
        /* ignore */
      }
    },
    [gameId, getAchievements],
  );

  return {
    saveSnapshot,
    loadSnapshot,
    getHighScore,
    setHighScore,
    getAchievements,
    unlockAchievement,
  };
};

export const colorBlindPalettes = {
  normal: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
  protanopia: ['#000000', '#ffffff', '#ff6f00', '#008f00', '#0000ff'],
  deuteranopia: ['#000000', '#ffffff', '#ff0000', '#7f7f00', '#0000ff'],
  tritanopia: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#7f7fff'],
};

export const useInputLatencyTest = () => {
  const [latency, setLatency] = useState(null);

  const start = useCallback(() => {
    const begin = performance.now();
    const handler = () => {
      setLatency(performance.now() - begin);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler, { once: true });
  }, []);

  return { latency, start };
};

export default useGameControls;
