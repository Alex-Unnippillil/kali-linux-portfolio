export interface InstrumentationEvent {
  event: string;
  payload?: unknown;
  timestamp: number;
  metrics?: {
    fps?: number;
    frameDuration?: number;
    longTaskDuration?: number;
    workerQueueDepth?: number;
    workerQueuePeak?: number;
  };
}

type DevOverlayBridge = {
  pushEvent: (event: InstrumentationEvent) => void;
};

type DevWindow = Window & {
  __DEV_OVERLAY__?: DevOverlayBridge;
};

const isDev = () => process.env.NODE_ENV === 'development';

export const logDevEvent = (
  event: string,
  payload?: unknown,
  metrics?: InstrumentationEvent['metrics'],
): void => {
  if (!isDev()) return;

  const timestamp =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const entry: InstrumentationEvent = {
    event,
    payload,
    timestamp,
    metrics,
  };

  if (typeof window !== 'undefined') {
    const devWindow = window as DevWindow;
    const bridge = devWindow.__DEV_OVERLAY__;
    if (bridge?.pushEvent) {
      bridge.pushEvent(entry);
      return;
    }
  }

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(`[dev-event:${event}]`, entry);
  }
};

export const registerOverlayBridge = (
  receiver: (event: InstrumentationEvent) => void,
): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const devWindow = window as DevWindow;
  const previous = devWindow.__DEV_OVERLAY__;
  devWindow.__DEV_OVERLAY__ = { pushEvent: receiver };
  return () => {
    if (devWindow.__DEV_OVERLAY__?.pushEvent === receiver) {
      if (previous) {
        devWindow.__DEV_OVERLAY__ = previous;
      } else {
        delete devWindow.__DEV_OVERLAY__;
      }
    }
  };
};

export type { DevOverlayBridge };
