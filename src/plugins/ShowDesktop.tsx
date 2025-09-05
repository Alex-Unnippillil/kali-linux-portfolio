import React, { useEffect } from 'react';
import showDesktop from '../wm/showDesktop';

const DEFAULT_SHORTCUT = 'Meta+D';

/**
 * Panel button plugin which toggles the "show desktop" state.
 * It also listens for the default keyboard shortcut (Meta+D).
 */
export default function ShowDesktop() {
  const onClick = () => showDesktop();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey && key === 'D') {
        e.preventDefault();
        showDesktop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <button type="button" aria-label="Show Desktop" onClick={onClick}>
      ☐
    </button>
  );
}

export { DEFAULT_SHORTCUT };
