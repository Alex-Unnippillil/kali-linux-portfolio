import { useEffect, useState } from 'react';

/**
 * Tracks the last input source used (keyboard, touch, gamepad)
 * and exposes a flag to hide virtual touch controls when a
 * hardware input is detected.
 */
export default function useGameInput() {
  const [lastInput, setLastInput] = useState('touch');
  const [hideVirtualControls, setHideVirtualControls] = useState(false);

  useEffect(() => {
    const onKey = () => {
      setLastInput('keyboard');
      setHideVirtualControls(true);
    };
    const onGamepad = () => {
      setLastInput('gamepad');
      setHideVirtualControls(true);
    };
    const onTouch = () => {
      setLastInput('touch');
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('gamepadconnected', onGamepad);
    window.addEventListener('pointerdown', onTouch);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('gamepadconnected', onGamepad);
      window.removeEventListener('pointerdown', onTouch);
    };
  }, []);

  return { lastInput, hideVirtualControls };
}
