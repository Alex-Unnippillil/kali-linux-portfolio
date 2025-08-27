import { useEffect } from 'react';

// Basic keyboard input handler. Works even when no touch or gamepad is present.
export default function useGameInput({ onInput } = {}) {
  useEffect(() => {
    const handle = (e) => {
      onInput && onInput(e);
    };
    window.addEventListener('keydown', handle);
    window.addEventListener('keyup', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('keyup', handle);
    };
  }, [onInput]);
}
