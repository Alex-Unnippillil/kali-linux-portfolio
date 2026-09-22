'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createShowDesktopController, type DesktopSnapshot } from '../../utils/showDesktopController';
import styles from './ShowDesktopButton.module.css';

const controller = createShowDesktopController((detail) => {
  window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
});
const initial = { showing: false, busy: false, available: false };
let users = 0;
function onWorkspace(event: Event) {
  const detail = (event as CustomEvent<DesktopSnapshot>).detail;
  if (!detail || !Number.isInteger(detail.activeWorkspace) || !Array.isArray(detail.runningApps)) return;
  controller.update({
    activeWorkspace: detail.activeWorkspace,
    runningApps: detail.runningApps.filter((app) => app && typeof app.id === 'string'),
  });
}

/** Shared state keeps the desktop and phone controls synchronized across rotation. */
export default function ShowDesktopButton() {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => initial);
  useEffect(() => {
    if (users++ === 0) window.addEventListener('workspace-state', onWorkspace);
    window.dispatchEvent(new CustomEvent('workspace-request'));
    return () => {
      if (--users === 0) {
        window.removeEventListener('workspace-state', onWorkspace);
        controller.reset();
      }
    };
  }, []);
  const label = state.showing ? 'Restore windows' : 'Show desktop';
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      aria-pressed={state.showing}
      aria-busy={state.busy}
      disabled={state.busy || !state.available}
      onClick={(event) => { event.stopPropagation(); controller.toggle(); }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
        {state.showing && <path d="m8 10 3 3 5-5" />}
      </svg>
    </button>
  );
}
