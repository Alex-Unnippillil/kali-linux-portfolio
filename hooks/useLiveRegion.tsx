import React, {
  PropsWithChildren,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const CLEAR_DELAY = 60;
const NEXT_DELAY = 120;
const DEDUP_WINDOW = 750;

export type PolitenessSetting = 'polite' | 'assertive';

export interface AnnouncementOptions {
  politeness?: PolitenessSetting;
  priority?: 'normal' | 'urgent';
}

interface QueuedAnnouncement {
  id: number;
  message: string;
  options?: AnnouncementOptions;
}

interface LiveRegionContextValue {
  announce: (message: string, options?: AnnouncementOptions) => void;
}

interface LiveRegionProviderProps extends PropsWithChildren {
  onAnnounce?: (message: string, options: AnnouncementOptions) => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);
const fallbackContext: LiveRegionContextValue = {
  announce: () => undefined,
};
let warnedMissingProvider = false;

const toAnnouncementString = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node
      .map((item) => toAnnouncementString(item))
      .filter(Boolean)
      .join(' ');
  }
  if (isValidElement(node)) {
    return toAnnouncementString(node.props.children);
  }
  return '';
};

export const LiveRegionProvider: React.FC<LiveRegionProviderProps> = ({
  children,
  onAnnounce,
}) => {
  const [current, setCurrent] = useState<{
    message: string;
    politeness: PolitenessSetting;
  } | null>(null);

  const queueRef = useRef<QueuedAnnouncement[]>([]);
  const idRef = useRef(0);
  const processingRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncementRef = useRef<{
    message: string;
    timestamp: number;
  } | null>(null);

  const flushQueue = useCallback(() => {
    if (processingRef.current) return;
    if (!queueRef.current.length) return;

    const now = Date.now();
    let next: QueuedAnnouncement | undefined;

    while (queueRef.current.length) {
      const candidate = queueRef.current.shift();
      if (!candidate) break;
      const trimmed = candidate.message.trim();
      if (!trimmed) continue;

      const last = lastAnnouncementRef.current;
      if (last && last.message === trimmed && now - last.timestamp < DEDUP_WINDOW) {
        continue;
      }

      next = { ...candidate, message: trimmed };
      break;
    }

    if (!next) {
      if (queueRef.current.length) {
        nextTimerRef.current = setTimeout(() => {
          nextTimerRef.current = null;
          flushQueue();
        }, DEDUP_WINDOW);
      }
      return;
    }

    processingRef.current = true;
    lastAnnouncementRef.current = { message: next.message, timestamp: now };

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }

    setCurrent(null);

    clearTimerRef.current = setTimeout(() => {
      const politeness = next?.options?.politeness ?? 'polite';
      setCurrent({ message: next!.message, politeness });
      onAnnounce?.(next!.message, next!.options ?? {});
      processingRef.current = false;
      clearTimerRef.current = null;

      nextTimerRef.current = setTimeout(() => {
        nextTimerRef.current = null;
        flushQueue();
      }, NEXT_DELAY);
    }, CLEAR_DELAY);
  }, [onAnnounce]);

  const announce = useCallback(
    (message: string, options?: AnnouncementOptions) => {
      const trimmed = message?.trim();
      if (!trimmed) return;

      const announcement: QueuedAnnouncement = {
        id: idRef.current++,
        message: trimmed,
        options,
      };

      if (options?.priority === 'urgent') {
        queueRef.current.unshift(announcement);
      } else {
        queueRef.current.push(announcement);
      }

      flushQueue();
    },
    [flushQueue],
  );

  useEffect(
    () => () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      queueRef.current = [];
      processingRef.current = false;
    },
    [],
  );

  const contextValue = useMemo<LiveRegionContextValue>(() => ({ announce }), [announce]);

  return (
    <LiveRegionContext.Provider value={contextValue}>
      {children}
      <div
        role="status"
        aria-live={current?.politeness ?? 'polite'}
        aria-atomic="true"
        className="sr-only"
      >
        {current?.message ?? ''}
      </div>
    </LiveRegionContext.Provider>
  );
};

export const useLiveRegion = (): LiveRegionContextValue => {
  const ctx = useContext(LiveRegionContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production' && !warnedMissingProvider) {
      warnedMissingProvider = true;
      console.warn(
        'useLiveRegion used outside LiveRegionProvider; announcements will be ignored.',
      );
    }
    return fallbackContext;
  }
  return ctx;
};

export const useLiveAnnouncement = (
  message: React.ReactNode | null | undefined,
  options?: AnnouncementOptions,
) => {
  const { announce } = useLiveRegion();
  const text = useMemo(
    () => toAnnouncementString(message ?? '').replace(/\s+/g, ' ').trim(),
    [message],
  );
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!text) {
      lastRef.current = null;
      return;
    }
    if (lastRef.current === text) return;
    lastRef.current = text;
    announce(text, options);
  }, [announce, options?.politeness, options?.priority, text]);
};

export default LiveRegionProvider;
