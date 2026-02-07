import {
  getBool,
  getJson,
  migrateShellStorage,
  setBool,
  setJson,
  SHELL_STORAGE_KEYS,
} from '../../utils/storage';

export type SessionState = 'booting' | 'desktop' | 'locked' | 'shutdown';

export type ShellPrefs = {
  wallpaperName: string;
  theme: Record<string, unknown> | null;
  snap: { enabled: boolean; grid: [number, number] };
  iconDensity: 'compact' | 'comfortable' | 'spacious';
  pinnedApps: string[];
};

export type ShellUiState = {
  activeOverlay: string | null;
  activeContextMenu: string | null;
  focusedWindowId: string | null;
  workspaceId: number;
};

export type ShellState = {
  session: SessionState;
  prefs: ShellPrefs;
  ui: ShellUiState;
  bootSeen: boolean;
};

type Listener = (state: ShellState) => void;

type BootSequenceOptions = {
  minDelayMs?: number;
  maxDelayMs?: number;
  isTestEnv?: boolean;
};

const DEFAULT_PREFS: ShellPrefs = {
  wallpaperName: 'wall-2',
  theme: null,
  snap: { enabled: true, grid: [8, 8] },
  iconDensity: 'comfortable',
  pinnedApps: [],
};

const DEFAULT_UI: ShellUiState = {
  activeOverlay: null,
  activeContextMenu: null,
  focusedWindowId: null,
  workspaceId: 0,
};

const resolveInitialState = (): ShellState => {
  migrateShellStorage();
  const wallpaperName = getJson<string>(SHELL_STORAGE_KEYS.bgImage, DEFAULT_PREFS.wallpaperName);
  const bootSeen = getBool(SHELL_STORAGE_KEYS.bootSeen, false);
  const locked = getBool(SHELL_STORAGE_KEYS.lock, false);
  const shutdown = getBool(SHELL_STORAGE_KEYS.shutdown, false);
  const snap = getJson(SHELL_STORAGE_KEYS.snap, DEFAULT_PREFS.snap);
  const iconDensity = getJson(SHELL_STORAGE_KEYS.iconDensity, DEFAULT_PREFS.iconDensity);
  const pinnedApps = getJson(SHELL_STORAGE_KEYS.pinnedApps, DEFAULT_PREFS.pinnedApps);
  const theme = getJson(SHELL_STORAGE_KEYS.theme, DEFAULT_PREFS.theme);
  const workspaceId = getJson(SHELL_STORAGE_KEYS.workspaceId, DEFAULT_UI.workspaceId);
  const focusedWindowId = getJson(SHELL_STORAGE_KEYS.focusedWindowId, DEFAULT_UI.focusedWindowId);
  const activeOverlay = getJson(SHELL_STORAGE_KEYS.activeOverlay, DEFAULT_UI.activeOverlay);
  const activeContextMenu = getJson(
    SHELL_STORAGE_KEYS.activeContextMenu,
    DEFAULT_UI.activeContextMenu,
  );

  const prefs: ShellPrefs = {
    ...DEFAULT_PREFS,
    wallpaperName,
    snap,
    iconDensity,
    pinnedApps,
    theme,
  };

  const ui: ShellUiState = {
    ...DEFAULT_UI,
    activeOverlay,
    activeContextMenu,
    focusedWindowId,
    workspaceId,
  };

  let session: SessionState = 'desktop';
  if (shutdown) session = 'shutdown';
  else if (locked) session = 'locked';
  else if (!bootSeen) session = 'booting';

  return {
    session,
    prefs,
    ui,
    bootSeen,
  };
};

export class ShellController {
  private state: ShellState;
  private listeners = new Set<Listener>();
  private bootSequenceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private bootSequencePromise: Promise<void> | null = null;

  constructor() {
    this.state = resolveInitialState();
  }

  getState = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit = () => {
    this.listeners.forEach((listener) => listener(this.state));
  };

  private updateState = (partial: Partial<ShellState>) => {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emit();
  };

  private updatePrefs = (partial: Partial<ShellPrefs>) => {
    this.state = {
      ...this.state,
      prefs: {
        ...this.state.prefs,
        ...partial,
      },
    };
    this.emit();
  };

  private updateUi = (partial: Partial<ShellUiState>) => {
    this.state = {
      ...this.state,
      ui: {
        ...this.state.ui,
        ...partial,
      },
    };
    this.emit();
  };

  private clearBootTimers = () => {
    if (this.bootSequenceTimeoutId) {
      clearTimeout(this.bootSequenceTimeoutId);
      this.bootSequenceTimeoutId = null;
    }
  };

  runBootSequence = (options: BootSequenceOptions = {}) => {
    if (this.state.bootSeen || this.state.session !== 'booting') {
      return Promise.resolve();
    }

    if (this.bootSequencePromise) {
      return this.bootSequencePromise;
    }

    const isTestEnv = options.isTestEnv ?? typeof jest !== 'undefined';
    const minDelayMs = options.minDelayMs ?? (isTestEnv ? 0 : 350);
    const maxDelayMs = options.maxDelayMs ?? (isTestEnv ? 0 : 1200);
    const bootStartTime =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : null;

    this.bootSequencePromise = new Promise((resolve) => {
      const finalize = () => {
        this.clearBootTimers();
        this.bootSequencePromise = null;
        this.updateState({ session: 'desktop', bootSeen: true });
        setBool(SHELL_STORAGE_KEYS.bootSeen, true);
        setBool(SHELL_STORAGE_KEYS.shutdown, false);
        resolve();
      };

      if (isTestEnv) {
        finalize();
        return;
      }

      const scheduleFinalize = () => {
        const elapsed = bootStartTime !== null ? performance.now() - bootStartTime : 0;
        const remaining = Math.max(minDelayMs - elapsed, 0);
        if (remaining > 0) {
          this.bootSequenceTimeoutId = setTimeout(finalize, remaining);
          return;
        }
        requestAnimationFrame(finalize);
      };

      if (typeof document !== 'undefined' && document.readyState === 'complete') {
        scheduleFinalize();
        return;
      }

      const onLoad = () => {
        scheduleFinalize();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('load', onLoad, { once: true });
      }

      this.bootSequenceTimeoutId = setTimeout(scheduleFinalize, maxDelayMs);
    });

    return this.bootSequencePromise;
  };

  lock = () => {
    this.clearBootTimers();
    setBool(SHELL_STORAGE_KEYS.lock, true);
    setBool(SHELL_STORAGE_KEYS.shutdown, false);
    this.updateState({ session: 'locked' });
  };

  unlock = () => {
    setBool(SHELL_STORAGE_KEYS.lock, false);
    this.updateState({ session: 'desktop' });
  };

  shutdown = () => {
    this.clearBootTimers();
    setBool(SHELL_STORAGE_KEYS.shutdown, true);
    setBool(SHELL_STORAGE_KEYS.lock, false);
    this.updateState({ session: 'shutdown' });
  };

  turnOn = () => {
    setBool(SHELL_STORAGE_KEYS.shutdown, false);
    this.updateState({ session: 'booting' });
    return this.runBootSequence();
  };

  setTheme = (theme: Record<string, unknown> | null) => {
    setJson(SHELL_STORAGE_KEYS.theme, theme);
    this.updatePrefs({ theme });
  };

  setWallpaper = (wallpaperName: string) => {
    setJson(SHELL_STORAGE_KEYS.bgImage, wallpaperName);
    this.updatePrefs({ wallpaperName });
  };

  setSnapSettings = (snap: ShellPrefs['snap']) => {
    setJson(SHELL_STORAGE_KEYS.snap, snap);
    this.updatePrefs({ snap });
  };

  setIconDensity = (iconDensity: ShellPrefs['iconDensity']) => {
    setJson(SHELL_STORAGE_KEYS.iconDensity, iconDensity);
    this.updatePrefs({ iconDensity });
  };

  setPinnedApps = (pinnedApps: string[]) => {
    setJson(SHELL_STORAGE_KEYS.pinnedApps, pinnedApps);
    this.updatePrefs({ pinnedApps });
  };

  setActiveOverlay = (activeOverlay: string | null) => {
    setJson(SHELL_STORAGE_KEYS.activeOverlay, activeOverlay);
    this.updateUi({ activeOverlay });
  };

  setActiveContextMenu = (activeContextMenu: string | null) => {
    setJson(SHELL_STORAGE_KEYS.activeContextMenu, activeContextMenu);
    this.updateUi({ activeContextMenu });
  };

  focusWindow = (focusedWindowId: string | null) => {
    setJson(SHELL_STORAGE_KEYS.focusedWindowId, focusedWindowId);
    this.updateUi({ focusedWindowId });
  };

  setWorkspace = (workspaceId: number) => {
    setJson(SHELL_STORAGE_KEYS.workspaceId, workspaceId);
    this.updateUi({ workspaceId });
  };

  openApp = (id: string) => {
    this.setActiveOverlay(null);
    this.focusWindow(id);
  };

  closeApp = (id: string) => {
    if (this.state.ui.focusedWindowId === id) {
      this.focusWindow(null);
    }
  };
}

export const shellController = new ShellController();
