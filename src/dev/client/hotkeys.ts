import type { DevLogger } from '../types';

const HOTKEYS = {
  grid: 'KeyG',
  focus: 'KeyL',
  clear: 'KeyC',
} as const;

export function installDebugHotkeys(logger: DevLogger = console) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const handler = (event: KeyboardEvent) => {
    if (!event.altKey || !event.shiftKey) {
      return;
    }

    const helpers = window.__DEV_HELPERS__;
    if (!helpers) {
      return;
    }

    switch (event.code) {
      case HOTKEYS.grid:
        event.preventDefault();
        helpers.toggleGridOverlay();
        logger.info?.('[dev] Toggled layout debug grid');
        break;
      case HOTKEYS.focus:
        event.preventDefault();
        helpers.logActiveElement();
        break;
      case HOTKEYS.clear:
        event.preventDefault();
        helpers.clearPersistedState();
        logger.info?.('[dev] Cleared persisted state');
        break;
      default:
        break;
    }
  };

  window.addEventListener('keydown', handler);

  return () => {
    window.removeEventListener('keydown', handler);
  };
}
