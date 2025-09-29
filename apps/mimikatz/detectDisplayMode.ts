export type DisplayMode = 'browser' | 'standalone' | 'electron' | 'unknown';

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

type WindowLike = Window & { navigator?: NavigatorWithStandalone };

const standaloneQueries = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
];

export const detectDisplayMode = (win?: WindowLike): DisplayMode => {
  if (!win) return 'unknown';
  const nav = win.navigator;
  const userAgent = nav?.userAgent || '';

  if (/electron/i.test(userAgent)) {
    return 'electron';
  }

  if (typeof nav?.standalone === 'boolean' && nav.standalone) {
    return 'standalone';
  }

  const matchMedia = win.matchMedia?.bind(win);
  if (matchMedia) {
    for (const query of standaloneQueries) {
      try {
        if (matchMedia(query).matches) {
          return 'standalone';
        }
      } catch {
        // ignore matchMedia errors and continue checking other queries
      }
    }
  }

  return 'browser';
};

export const isBrowserDisplayMode = (mode: DisplayMode) =>
  mode === 'browser' || mode === 'unknown';
