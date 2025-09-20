export type NotificationPriority =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'alarm'
  | 'critical';

export interface FullscreenState {
  isFullscreen: boolean;
  silenceNotifications: boolean;
}

type Listener = (state: FullscreenState) => void;

type OverrideState = Partial<FullscreenState> | null;

const SILENCE_BYPASS = new Set<NotificationPriority>(['alarm', 'critical']);

let baseState: FullscreenState = {
  isFullscreen: false,
  silenceNotifications: false,
};

let overrideState: OverrideState = null;

let initialized = false;

const listeners = new Set<Listener>();

function getEffectiveState(): FullscreenState {
  if (!overrideState) {
    return baseState;
  }

  const isFullscreen =
    overrideState.isFullscreen !== undefined
      ? overrideState.isFullscreen
      : baseState.isFullscreen;

  const silenceNotifications =
    overrideState.silenceNotifications !== undefined
      ? overrideState.silenceNotifications
      : overrideState.isFullscreen !== undefined
        ? overrideState.isFullscreen
        : baseState.silenceNotifications;

  return { isFullscreen, silenceNotifications };
}

function notify() {
  const snapshot = getEffectiveState();
  listeners.forEach(listener => listener(snapshot));
}

function handleFullscreenChange() {
  if (typeof document === 'undefined') {
    return;
  }

  const isFullscreen = Boolean(document.fullscreenElement);
  const silenceNotifications = isFullscreen;

  if (
    baseState.isFullscreen !== isFullscreen ||
    baseState.silenceNotifications !== silenceNotifications
  ) {
    baseState = { isFullscreen, silenceNotifications };
    notify();
  }
}

function ensureInitialized() {
  if (initialized) {
    return;
  }

  initialized = true;

  if (typeof document === 'undefined') {
    return;
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  handleFullscreenChange();
}

export function getFullscreenState(): FullscreenState {
  ensureInitialized();
  return getEffectiveState();
}

export function subscribeToFullscreenChanges(listener: Listener): () => void {
  ensureInitialized();
  listeners.add(listener);
  listener(getEffectiveState());
  return () => {
    listeners.delete(listener);
  };
}

export function shouldSilenceNotification(
  priority: NotificationPriority = 'default',
): boolean {
  const { silenceNotifications } = getFullscreenState();
  if (!silenceNotifications) {
    return false;
  }
  return !SILENCE_BYPASS.has(priority);
}

export function isFullscreenActive(): boolean {
  return getFullscreenState().isFullscreen;
}

export function areNotificationsSilenced(): boolean {
  return getFullscreenState().silenceNotifications;
}

function setOverride(state: OverrideState) {
  overrideState = state;
  notify();
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const debugApi = {
    setFullscreen(active: boolean) {
      setOverride({ isFullscreen: active, silenceNotifications: active });
    },
    setSilenced(active: boolean) {
      setOverride({ silenceNotifications: active });
    },
    clear() {
      setOverride(null);
      handleFullscreenChange();
    },
  };

  Object.defineProperty(window, '__KALI_FULLSCREEN_DEBUG__', {
    value: debugApi,
    configurable: true,
    writable: false,
  });
}

declare global {
  interface Window {
    __KALI_FULLSCREEN_DEBUG__?: {
      setFullscreen(active: boolean): void;
      setSilenced(active: boolean): void;
      clear(): void;
    };
  }
}

export {};
