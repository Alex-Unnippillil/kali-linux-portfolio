import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];
type SendArgs = Parameters<typeof ReactGA.send>;
type PageViewInput = SendArgs[0];

const safeInvoke = <Args extends unknown[]>(
  fn: ((...fnArgs: Args) => unknown) | undefined,
  args: Args,
): void => {
  try {
    if (typeof fn === 'function') {
      fn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  safeInvoke(ReactGA.event, args);
};

const safeSend = (...args: SendArgs): void => {
  safeInvoke(ReactGA.send, args);
};

export const logEvent = (event: EventInput): void => {
  safeEvent(event);
};

export const logPageView = (pageView: PageViewInput | string, title?: string): void => {
  if (typeof pageView === 'string') {
    const payload: Record<string, unknown> = {
      hitType: 'pageview',
      page: pageView,
    };

    if (title) {
      payload.title = title;
    }

    safeSend(payload as PageViewInput);
    return;
  }

  safeSend(pageView as PageViewInput);
};

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};
