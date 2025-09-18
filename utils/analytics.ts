import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  try {
    const eventFn = ReactGA.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

export const logEvent = (event: EventInput): void => {
  safeEvent(event);
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

interface SettingsSearchEvent {
  query: string;
  sectionId: string;
  controlSlug: string;
  position?: number;
  total?: number;
}

export const logSettingsSearchNavigation = ({
  query,
  sectionId,
  controlSlug,
  position,
  total,
}: SettingsSearchEvent): void => {
  const params: Record<string, unknown> = {
    section_id: sectionId,
    control_slug: controlSlug,
    query,
  };
  if (typeof position === 'number') {
    params.match_position = position + 1;
  }
  if (typeof total === 'number') {
    params.match_total = total;
  }
  safeEvent('settings_search', params);
};
