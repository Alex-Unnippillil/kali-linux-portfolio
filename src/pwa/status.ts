export type PwaAction = 'install' | 'reload';

export type PwaStatus = {
  type: 'install-ready' | 'installed' | 'update-ready' | 'updated';
  message?: string;
  action?: PwaAction;
  timestamp?: number;
};

const STATUS_EVENT = 'pwa:status';
const STATUS_STORAGE_KEY = 'pwa:lastStatus';
const STATUS_CHANNEL = 'pwa-status';

function isPwaStatus(value: unknown): value is PwaStatus {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.type !== 'string') return false;
  return (
    candidate.type === 'install-ready' ||
    candidate.type === 'installed' ||
    candidate.type === 'update-ready' ||
    candidate.type === 'updated'
  );
}

function withTimestamp(status: PwaStatus): PwaStatus {
  return { ...status, timestamp: Date.now() };
}

export function broadcastStatus(status: PwaStatus) {
  if (typeof window === 'undefined') return;
  const payload = withTimestamp(status);
  try {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail: payload }));
  } catch (err) {
    console.warn('Failed to dispatch PWA status event', err);
  }

  try {
    window.localStorage?.setItem(STATUS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to persist PWA status', err);
  }

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(STATUS_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch (err) {
    console.warn('Failed to broadcast PWA status', err);
  }
}

export function readStoredStatus(): PwaStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage?.getItem(STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPwaStatus(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function subscribeToStatus(callback: (status: PwaStatus) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent)?.detail;
    if (isPwaStatus(detail)) {
      callback(detail);
    }
  };

  window.addEventListener(STATUS_EVENT, handler);

  let channel: BroadcastChannel | null = null;
  let channelHandler: ((event: MessageEvent) => void) | null = null;

  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(STATUS_CHANNEL);
      channelHandler = (event: MessageEvent) => {
        if (isPwaStatus(event.data)) {
          callback(event.data);
        }
      };
      channel.addEventListener('message', channelHandler);
    } catch (err) {
      console.warn('Failed to subscribe to PWA status channel', err);
      channel = null;
      channelHandler = null;
    }
  }

  return () => {
    window.removeEventListener(STATUS_EVENT, handler);
    if (channel && channelHandler) {
      channel.removeEventListener('message', channelHandler);
      channel.close();
    } else if (channel) {
      channel.close();
    }
  };
}

export const STATUS_DEFAULT_MESSAGES: Record<PwaStatus['type'], string> = {
  'install-ready': 'Install this app to unlock offline access.',
  installed: 'App installed. You can launch it from your home screen.',
  'update-ready': 'An update is ready. Reload to apply the latest changes.',
  updated: 'You are now running the latest version of the desktop.',
};

export const STATUS_STORAGE_KEY_NAME = STATUS_STORAGE_KEY;
export const STATUS_CHANNEL_NAME = STATUS_CHANNEL;
export const STATUS_EVENT_NAME = STATUS_EVENT;
