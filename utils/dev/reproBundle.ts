import type { AppNotification } from '../../components/common/NotificationCenter';
import type { SettingsContextValue } from '../../hooks/useSettings';
import { anonymizeValue, getRecorderSnapshot, replaceRecorderSnapshot, type ReproLog, type ReproStep } from './reproRecorder';

export const REPRO_BUNDLE_VERSION = 1;

export type SerializedNotification = Pick<
  AppNotification,
  'id' | 'appId' | 'title' | 'body' | 'timestamp' | 'read' | 'priority'
> & {
  hints?: Record<string, unknown>;
  classification?: {
    matchedRuleId: string | null;
    priority: AppNotification['priority'];
    source: string;
  };
};

export interface SettingsSnapshot {
  accent: string;
  wallpaper: string;
  bgImageName: string;
  useKaliWallpaper: boolean;
  density: SettingsContextValue['density'];
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
}

export interface LocalStateSnapshot {
  recentApps: string[];
  storage: Record<string, unknown>;
}

export interface ReproState {
  settings: SettingsSnapshot;
  notifications: Record<string, SerializedNotification[]>;
  local: LocalStateSnapshot;
}

export interface ReproBundle {
  version: number;
  exportedAt: string;
  state: ReproState;
  steps: ReproStep[];
  logs: ReproLog[];
}

export const LOCAL_STORAGE_KEYS = [
  'desktop_icon_positions',
  'pinnedApps',
  'frequentApps',
  'app_shortcuts',
  'window-trash',
  'new_folders',
  'trash-purge-days',
  'lab-mode',
  'lab-mode:auto',
  'lab-mode:persist',
  'snap-enabled',
  'screen-locked',
  'booting_screen',
  'shut-down',
  'kali-recent',
];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const ensurePlainObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const extractSettingsSnapshot = (settings: SettingsContextValue): SettingsSnapshot => ({
  accent: settings.accent,
  wallpaper: settings.wallpaper,
  bgImageName: settings.bgImageName,
  useKaliWallpaper: settings.useKaliWallpaper,
  density: settings.density,
  reducedMotion: settings.reducedMotion,
  fontScale: settings.fontScale,
  highContrast: settings.highContrast,
  largeHitAreas: settings.largeHitAreas,
  pongSpin: settings.pongSpin,
  allowNetwork: settings.allowNetwork,
  haptics: settings.haptics,
  theme: settings.theme,
});

export const collectLocalState = (
  storage: StorageLike | undefined,
  keys: string[] = LOCAL_STORAGE_KEYS,
): Record<string, unknown> => {
  if (!storage) return {};
  const result: Record<string, unknown> = {};
  keys.forEach((key) => {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        try {
          result[key] = anonymizeValue(JSON.parse(value));
        } catch {
          result[key] = anonymizeValue(value);
        }
      }
    } catch {
      // ignore storage read errors
    }
  });
  return result;
};

export const serializeNotifications = (
  notificationsByApp: Record<string, AppNotification[]>,
): Record<string, SerializedNotification[]> => {
  const snapshot: Record<string, SerializedNotification[]> = {};
  Object.entries(notificationsByApp).forEach(([appId, list]) => {
    snapshot[appId] = list.map((notification) => ({
      id: notification.id,
      appId,
      title:
        typeof notification.title === 'string'
          ? (anonymizeValue(notification.title) as string)
          : '',
      body: notification.body ? (anonymizeValue(String(notification.body)) as string) : undefined,
      timestamp: notification.timestamp,
      read: Boolean(notification.read),
      priority: notification.priority,
      hints: notification.hints ? ensurePlainObject(anonymizeValue(notification.hints)) : undefined,
      classification: notification.classification
        ? {
            matchedRuleId: notification.classification.matchedRuleId,
            priority: notification.classification.priority,
            source: notification.classification.source,
          }
        : undefined,
    }));
  });
  return snapshot;
};

export const buildReproBundle = (
  settings: SettingsContextValue,
  notificationsByApp: Record<string, AppNotification[]>,
  localState: LocalStateSnapshot,
): ReproBundle => {
  const { steps, logs } = getRecorderSnapshot();
  return {
    version: REPRO_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    state: {
      settings: extractSettingsSnapshot(settings),
      notifications: serializeNotifications(notificationsByApp),
      local: {
        recentApps: [...localState.recentApps],
        storage: anonymizeValue(localState.storage) as Record<string, unknown>,
      },
    },
    steps,
    logs,
  };
};

export interface SettingsHydrator {
  setAccent: (value: string) => void;
  setWallpaper: (value: string) => void;
  setUseKaliWallpaper: (value: boolean) => void;
  setDensity: (value: SettingsContextValue['density']) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setTheme: (value: string) => void;
}

export interface NotificationsHydrator {
  hydrateNotifications: (snapshot: Record<string, SerializedNotification[]>) => void;
}

export interface HydrationOptions {
  storage?: StorageLike;
  writeRecentApps?: (ids: string[]) => void;
}

export const applyReproBundle = (
  bundle: unknown,
  handlers: {
    settings: SettingsHydrator;
    notifications: NotificationsHydrator;
  },
  options: HydrationOptions = {},
): ReproBundle => {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('Invalid bundle');
  }
  const parsed = bundle as Partial<ReproBundle>;
  if (typeof parsed.version !== 'number') {
    throw new Error('Bundle missing version');
  }
  if (!parsed.state) {
    throw new Error('Bundle missing state');
  }
  if (parsed.version > REPRO_BUNDLE_VERSION) {
    throw new Error(`Unsupported bundle version ${parsed.version}`);
  }

  const state = parsed.state as ReproState;
  const { settings, notifications, local } = state;

  if (settings) {
    if (settings.accent) handlers.settings.setAccent(settings.accent);
    if (settings.wallpaper) handlers.settings.setWallpaper(settings.wallpaper);
    if (settings.useKaliWallpaper !== undefined) handlers.settings.setUseKaliWallpaper(Boolean(settings.useKaliWallpaper));
    if (settings.density) handlers.settings.setDensity(settings.density);
    if (settings.reducedMotion !== undefined) handlers.settings.setReducedMotion(Boolean(settings.reducedMotion));
    if (typeof settings.fontScale === 'number') handlers.settings.setFontScale(settings.fontScale);
    if (settings.highContrast !== undefined) handlers.settings.setHighContrast(Boolean(settings.highContrast));
    if (settings.largeHitAreas !== undefined) handlers.settings.setLargeHitAreas(Boolean(settings.largeHitAreas));
    if (settings.pongSpin !== undefined) handlers.settings.setPongSpin(Boolean(settings.pongSpin));
    if (settings.allowNetwork !== undefined) handlers.settings.setAllowNetwork(Boolean(settings.allowNetwork));
    if (settings.haptics !== undefined) handlers.settings.setHaptics(Boolean(settings.haptics));
    if (settings.theme) handlers.settings.setTheme(settings.theme);
  }

  if (notifications) {
    handlers.notifications.hydrateNotifications(notifications);
  }

  if (local) {
    if (options.storage) {
      Object.entries(local.storage || {}).forEach(([key, value]) => {
        try {
          if (value === undefined || value === null) {
            options.storage!.removeItem(key);
            return;
          }
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          options.storage!.setItem(key, serialized);
        } catch {
          // ignore storage failures
        }
      });
    }
    if (options.writeRecentApps && Array.isArray(local.recentApps)) {
      options.writeRecentApps(local.recentApps.filter((id): id is string => typeof id === 'string'));
    }
  }

  replaceRecorderSnapshot(parsed.steps ?? [], parsed.logs ?? []);
  return {
    version: parsed.version,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    state,
    steps: parsed.steps ?? [],
    logs: parsed.logs ?? [],
  };
};
