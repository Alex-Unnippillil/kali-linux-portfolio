import type { CleanupResult, DevHelpers, DevLogger } from '../types';

const STYLE_ID = 'dev-grid-overlay-style';
const GRID_CLASS = 'dev-grid-overlay';

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (existing) {
    return existing;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${GRID_CLASS} * {
      outline: 1px dashed rgba(99, 102, 241, 0.5);
      outline-offset: -1px;
    }
  `;
  return style;
}

function attachHelpers(logger: DevLogger): DevHelpers {
  let gridEnabled = false;
  const styleElement = ensureStyleElement();

  const helpers: DevHelpers = {
    toggleGridOverlay() {
      const root = document.documentElement;
      gridEnabled = !gridEnabled;
      if (gridEnabled) {
        if (!styleElement.parentElement) {
          document.head.appendChild(styleElement);
        }
        root.classList.add(GRID_CLASS);
      } else {
        root.classList.remove(GRID_CLASS);
      }
      logger.info?.(`[dev] Layout grid ${gridEnabled ? 'enabled' : 'disabled'}`);
    },
    logActiveElement() {
      const active = document.activeElement;
      if (active) {
        logger.info?.('[dev] Active element', active);
      } else {
        logger.info?.('[dev] No active element detected');
      }
    },
    clearPersistedState() {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
        logger.info?.('[dev] Cleared local and session storage');
      } catch (error) {
        logger.warn?.('[dev] Failed to clear storage', error);
      }
    },
  };

  return helpers;
}

export function exposeDevHelpers(logger: DevLogger = console): CleanupResult {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const global = window as Window & { __DEV_HELPERS__?: DevHelpers };
  if (global.__DEV_HELPERS__) {
    logger.debug?.('[dev] Helper API already registered');
    return undefined;
  }

  const helpers = attachHelpers(logger);
  global.__DEV_HELPERS__ = helpers;
  logger.info?.('[dev] Dev helpers attached to window.__DEV_HELPERS__');

  return () => {
    delete global.__DEV_HELPERS__;
    document.documentElement.classList.remove(GRID_CLASS);
    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
    }
  };
}
