export interface EmptyStateInventoryItem {
  id: string;
  appId: string;
  scenario: string;
  title: string;
  description: string;
  primaryActionLabel: string;
  documentation: {
    label: string;
    url: string;
  };
  secondaryDocumentation?: {
    label: string;
    url: string;
  };
}

const items: EmptyStateInventoryItem[] = [
  {
    id: 'weather-no-cities',
    appId: 'weather',
    scenario: 'No saved locations',
    title: 'Track your first city',
    description:
      'Add a location or import a saved group to start monitoring forecast data.',
    primaryActionLabel: 'Add sample city',
    documentation: {
      label: 'Open Open-Meteo quickstart',
      url: 'https://open-meteo.com/en/docs',
    },
  },
  {
    id: 'resource-monitor-active-empty',
    appId: 'resource-monitor',
    scenario: 'No in-flight network requests',
    title: 'No active requests',
    description:
      'Kick off a fetch to watch the proxy record live telemetry.',
    primaryActionLabel: 'Run demo request',
    documentation: {
      label: 'Review Fetch API docs',
      url: 'https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch',
    },
    secondaryDocumentation: {
      label: 'Inspect performance entries',
      url: 'https://developer.mozilla.org/docs/Web/API/PerformanceResourceTiming',
    },
  },
  {
    id: 'resource-monitor-history-empty',
    appId: 'resource-monitor',
    scenario: 'No captured request history',
    title: 'No captures yet',
    description:
      'Trigger a network call to populate duration and size metrics.',
    primaryActionLabel: 'Capture demo request',
    documentation: {
      label: 'Read logging best practices',
      url: 'https://web.dev/monitor-total-page-size/',
    },
  },
  {
    id: 'quote-no-results',
    appId: 'quote',
    scenario: 'Filters exclude all quotes',
    title: 'Nothing matches the filters',
    description:
      'Reset the filters or import a dataset to explore new inspiration.',
    primaryActionLabel: 'Reset filters',
    documentation: {
      label: 'Explore Quotable API docs',
      url: 'https://github.com/lukePeavey/quotable',
    },
    secondaryDocumentation: {
      label: 'Browse Type.fit collection',
      url: 'https://type.fit/api/quotes',
    },
  },
];

const byId = new Map(items.map((item) => [item.id, item]));

export function getEmptyStateCopy(id: string): EmptyStateInventoryItem {
  const entry = byId.get(id);
  if (!entry) {
    throw new Error(`Missing empty state copy for id: ${id}`);
  }
  return entry;
}

export function listEmptyStatesForApp(appId: string) {
  return items.filter((item) => item.appId === appId);
}

export const EMPTY_STATE_INVENTORY = items;
