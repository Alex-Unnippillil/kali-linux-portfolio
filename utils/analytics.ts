type AnalyticsEvent = {
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
};

type GtagEventParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
  non_interaction?: boolean;
  page_path?: string;
  page_title?: string;
};

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: GtagEventParams) => void;
  }
}

const isAnalyticsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && typeof window !== 'undefined';

const sendEvent = (eventName: string, params?: GtagEventParams): void => {
  if (!isAnalyticsEnabled()) return;
  if (typeof window.gtag !== 'function') return;

  try {
    window.gtag('event', eventName, params);
  } catch {
    // Ignore analytics errors
  }
};

export const logEvent = (event: AnalyticsEvent): void => {
  const action = event.action ?? 'event';
  sendEvent(action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
    non_interaction: event.nonInteraction,
  });
};

export const logPageView = (page: string, title?: string): void => {
  sendEvent('page_view', {
    page_path: page,
    page_title: title,
  });
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
