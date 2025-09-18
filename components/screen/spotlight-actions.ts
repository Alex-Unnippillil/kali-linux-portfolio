import { getTheme, isDarkTheme, setTheme } from '../../utils/theme';

export type SpotlightActionStatus = 'success' | 'error';

export interface SpotlightActionResult {
  status: SpotlightActionStatus;
  message?: string;
  closeMenu?: boolean;
}

export interface SpotlightActionMetadata {
  /**
   * Stable identifier used for lookup and plugin registration.
   */
  id: string;
  /**
   * Primary label shown in spotlight results.
   */
  title: string;
  /**
   * Short helper text displayed under the title.
   */
  description?: string;
  /**
   * Extra search keywords to improve discoverability.
   */
  keywords?: string[];
  /**
   * Optional icon URL when rendering custom results.
   */
  icon?: string;
  /**
   * When true, close the spotlight menu automatically after a successful run.
   */
  closeOnSuccess?: boolean;
}

export interface SpotlightActionDefinition extends SpotlightActionMetadata {
  /**
   * Execute the action. Returning {@link SpotlightActionResult} controls
   * the success state surfaced to the user.
   */
  run: () => Promise<SpotlightActionResult | void> | SpotlightActionResult | void;
}

const registry = new Map<string, SpotlightActionDefinition>();

export const registerSpotlightAction = (
  action: SpotlightActionDefinition,
): (() => void) => {
  if (registry.has(action.id)) {
    throw new Error(`Spotlight action with id "${action.id}" already registered`);
  }
  registry.set(action.id, action);
  return () => {
    registry.delete(action.id);
  };
};

export const unregisterSpotlightAction = (id: string): void => {
  registry.delete(id);
};

export const listSpotlightActions = (): SpotlightActionDefinition[] =>
  Array.from(registry.values());

export const searchSpotlightActions = (query: string): SpotlightActionDefinition[] => {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return listSpotlightActions();
  return listSpotlightActions().filter((action) => {
    const haystack = [
      action.title,
      action.description,
      ...(action.keywords ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalised);
  });
};

export const executeSpotlightAction = async (
  id: string,
): Promise<SpotlightActionResult> => {
  const action = registry.get(id);
  if (!action) {
    return {
      status: 'error',
      message: `Action \"${id}\" not found`,
    };
  }
  try {
    const result = await action.run();
    if (!result) {
      return { status: 'success' };
    }
    return result;
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Action failed',
    };
  }
};

const persistQuickSettingsTheme = (theme: 'dark' | 'light') => {
  try {
    window.localStorage.setItem('qs-theme', JSON.stringify(theme));
  } catch {
    // ignore persistence errors
  }
};

const toggleTheme: SpotlightActionDefinition = {
  id: 'toggle-theme',
  title: 'Toggle Theme',
  description: 'Switch between light and dark appearance.',
  keywords: ['dark mode', 'light mode'],
  run: () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        status: 'error',
        message: 'Theme toggle requires a browser environment.',
      };
    }
    const current = getTheme();
    const next = isDarkTheme(current) ? 'default' : 'dark';
    setTheme(next);
    persistQuickSettingsTheme(next === 'dark' ? 'dark' : 'light');
    window.document.documentElement.dataset.theme = next;
    window.dispatchEvent(
      new CustomEvent('settings:theme-change', { detail: next }),
    );
    return {
      status: 'success',
      message: `Theme set to ${next === 'dark' ? 'dark' : 'light'} mode`,
    };
  },
};

const openTerminal: SpotlightActionDefinition = {
  id: 'open-terminal',
  title: 'Open Terminal',
  description: 'Launch the terminal application.',
  keywords: ['shell', 'console', 'command'],
  closeOnSuccess: true,
  run: () => {
    if (typeof window === 'undefined') {
      return {
        status: 'error',
        message: 'Terminal can only be opened in the browser.',
      };
    }
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
    return {
      status: 'success',
      message: 'Opening Terminal…',
      closeMenu: true,
    };
  },
};

const LOCAL_STORAGE_CACHE_KEYS = [
  'recentApps',
  'lastPluginRun',
  'installedPlugins',
];

const clearCache: SpotlightActionDefinition = {
  id: 'clear-cache',
  title: 'Clear Cache',
  description: 'Remove cached data and stored plugin results.',
  keywords: ['storage', 'offline', 'reset'],
  run: async () => {
    if (typeof window === 'undefined') {
      return {
        status: 'error',
        message: 'Cache clearing requires a browser context.',
      };
    }
    const cleared: string[] = [];
    if ('caches' in window) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
        if (keys.length) cleared.push('offline caches');
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to clear caches',
        };
      }
    }
    try {
      LOCAL_STORAGE_CACHE_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
      });
      if (LOCAL_STORAGE_CACHE_KEYS.length) {
        cleared.push('stored results');
      }
    } catch {
      // ignore storage errors, user may have disabled access
    }
    const message = cleared.length
      ? `Cleared ${cleared.join(' and ')}`
      : 'Nothing to clear';
    return {
      status: 'success',
      message,
    };
  },
};

const builtins = [toggleTheme, openTerminal, clearCache];

builtins.forEach((action) => {
  if (!registry.has(action.id)) {
    registry.set(action.id, action);
  }
});

export const __TEST_ONLY__resetSpotlightRegistry = () => {
  registry.clear();
  builtins.forEach((action) => registry.set(action.id, action));
};

