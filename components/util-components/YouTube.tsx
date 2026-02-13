'use client';

import {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const ALLOWED_ORIGINS = new Set([YT_ORIGIN, 'https://www.youtube.com']);

export type YouTubeChapter = {
  title: string;
  startTime: number;
};

export type YouTubeVideoData = {
  video_id?: string;
  author?: string;
  title?: string;
  video_url?: string;
  channelId?: string;
  isLive?: boolean;
  keywords?: string[];
  chapters?: YouTubeChapter[];
  [key: string]: unknown;
};

export type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

type PendingResolvers = Map<string, Array<(value: any) => void>>;

type CommandMessage = {
  event: 'command';
  func: string;
  args?: unknown[];
};

type RawMessage = CommandMessage | { event: 'listening' };

export interface YouTubeHandle {
  activate: () => Promise<void>;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => Promise<number>;
  getAvailablePlaybackRates: () => Promise<number[]>;
  getCurrentTime: () => Promise<number>;
  getVideoData: () => Promise<YouTubeVideoData | null>;
  getIframe: () => HTMLIFrameElement | null;
}

export interface YouTubeProps {
  videoId: string;
  title: string;
  className?: string;
  style?: CSSProperties;
  active?: boolean;
  captions?: boolean;
  onReady?: () => void;
  onStateChange?: (state: PlayerState) => void;
}

type MessagePayload = {
  event?: string;
  id?: string;
  info?: Record<string, any> | number;
};

function parseMessage(data: unknown): MessagePayload | null {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as MessagePayload;
    } catch {
      return null;
    }
  }
  if (typeof data === 'object' && data !== null) {
    return data as MessagePayload;
  }
  return null;
}

function useUniqueId(prefix: string): string {
  return useMemo(() => `${prefix}-${Math.random().toString(36).slice(2, 10)}`, [prefix]);
}

function resolveQueue(map: PendingResolvers, key: string, value: any) {
  const queue = map.get(key);
  if (!queue?.length) return;
  const resolver = queue.shift();
  if (resolver) resolver(value);
  if (queue.length === 0) {
    map.delete(key);
  } else {
    map.set(key, queue);
  }
}

const YouTube = forwardRef<YouTubeHandle, YouTubeProps>(
  (
    {
      videoId,
      title,
      className,
      style,
      active = false,
      captions = true,
      onReady,
      onStateChange,
    },
    ref,
  ) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const playerId = useUniqueId('yt-player');
    const [shouldLoad, setShouldLoad] = useState(active);
    const [isReady, setIsReady] = useState(false);
    const readyResolvers = useRef<Array<() => void>>([]);
    const commandQueue = useRef<CommandMessage[]>([]);
    const infoResolvers = useRef<PendingResolvers>(new Map());
    const isMounted = useRef(true);

    const [origin, setOrigin] = useState<string | null>(null);

    useEffect(() => {
      setOrigin(typeof window !== 'undefined' ? window.location.origin : null);
    }, []);

    useEffect(() => {
      if (active) {
        setShouldLoad(true);
      }
    }, [active]);

    useEffect(() => () => {
      isMounted.current = false;
      readyResolvers.current = [];
      infoResolvers.current.clear();
      commandQueue.current = [];
    }, []);

    const sendMessage = useCallback(
      (message: RawMessage) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
          JSON.stringify({ ...message, id: playerId }),
          YT_ORIGIN,
        );
      },
      [playerId],
    );

    const flushCommands = useCallback(() => {
      if (!isReady) return;
      const items = commandQueue.current;
      commandQueue.current = [];
      for (const item of items) {
        sendMessage(item);
      }
    }, [isReady, sendMessage]);

    useEffect(() => {
      if (isReady) {
        flushCommands();
        onReady?.();
        const resolvers = readyResolvers.current;
        readyResolvers.current = [];
        for (const resolve of resolvers) {
          resolve();
        }
      }
    }, [isReady, flushCommands, onReady]);

    const ensureActive = useCallback(() => {
      if (!shouldLoad) {
        throw new Error('YouTube player not activated');
      }
    }, [shouldLoad]);

    const ensureReady = useCallback(() => {
      if (isReady) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        readyResolvers.current.push(resolve);
      });
    }, [isReady]);

    const sendCommand = useCallback(
      (func: string, args: unknown[] = []) => {
        if (!shouldLoad) return;
        const message: CommandMessage = { event: 'command', func, args };
        if (!isReady) {
          commandQueue.current.push(message);
          return;
        }
        sendMessage(message);
      },
      [isReady, sendMessage, shouldLoad],
    );

    const requestInfo = useCallback(
      async (func: string, infoKey: string, args: unknown[] = []) => {
        ensureActive();
        await ensureReady();
        return new Promise<any>((resolve, reject) => {
          if (!isMounted.current) {
            reject(new Error('YouTube player unmounted'));
            return;
          }
          const queue = infoResolvers.current.get(infoKey) ?? [];
          queue.push(resolve);
          infoResolvers.current.set(infoKey, queue);
          sendCommand(func, args);
        });
      },
      [ensureReady, sendCommand],
    );

    const handleIframeLoad = useCallback(() => {
      sendMessage({ event: 'listening' });
    }, [sendMessage]);

    const messageHandler = useCallback(
      (event: MessageEvent) => {
        if (!ALLOWED_ORIGINS.has(event.origin)) return;
        const payload = parseMessage(event.data);
        if (!payload || payload.id !== playerId) return;
        if (payload.event === 'onReady') {
          setIsReady(true);
          return;
        }
        if (payload.event === 'onStateChange') {
          const value =
            typeof payload.info === 'number'
              ? (payload.info as PlayerState)
              : (payload.info?.playerState as PlayerState | undefined);
          if (typeof value === 'number') {
            onStateChange?.(value);
            resolveQueue(infoResolvers.current, 'playerState', value);
          }
          return;
        }
        if (payload.event === 'infoDelivery' && payload.info) {
          const info = payload.info as Record<string, any>;
          for (const [key, value] of Object.entries(info)) {
            resolveQueue(infoResolvers.current, key, value);
            if (key === 'playerState' && typeof value === 'number') {
              onStateChange?.(value as PlayerState);
            }
          }
        }
      },
      [onStateChange, playerId],
    );

    useEffect(() => {
      if (!shouldLoad) return undefined;
      window.addEventListener('message', messageHandler);
      return () => {
        window.removeEventListener('message', messageHandler);
      };
    }, [messageHandler, shouldLoad]);

    useEffect(() => {
      if (!isReady) return;
      sendCommand('addEventListener', ['onStateChange']);
    }, [isReady, sendCommand]);

    useImperativeHandle(
      ref,
      () => ({
        activate: async () => {
          if (!shouldLoad) {
            setShouldLoad(true);
          }
          await ensureReady();
        },
        play: () => {
          sendCommand('playVideo');
        },
        pause: () => {
          sendCommand('pauseVideo');
        },
        seekTo: (seconds: number) => {
          sendCommand('seekTo', [seconds, true]);
        },
        setPlaybackRate: (rate: number) => {
          sendCommand('setPlaybackRate', [rate]);
        },
        getPlaybackRate: async () => {
          const rate = await requestInfo('getPlaybackRate', 'playbackRate');
          return typeof rate === 'number' ? rate : 1;
        },
        getAvailablePlaybackRates: async () => {
          const rates = await requestInfo(
            'getAvailablePlaybackRates',
            'availablePlaybackRates',
          );
          return Array.isArray(rates) ? rates : [1];
        },
        getCurrentTime: async () => {
          const time = await requestInfo('getCurrentTime', 'currentTime');
          return typeof time === 'number' ? time : 0;
        },
        getVideoData: async () => {
          const data = await requestInfo('getVideoData', 'videoData');
          return (data as YouTubeVideoData) ?? null;
        },
        getIframe: () => iframeRef.current,
      }),
      [ensureReady, requestInfo, sendCommand, shouldLoad],
    );

    const embedSrc = useMemo(() => {
      if (!shouldLoad) return undefined;
      const params = new URLSearchParams({
        autoplay: '0',
        enablejsapi: '1',
        playsinline: '1',
        rel: '0',
        modestbranding: '1',
      });
      if (captions) {
        params.set('cc_load_policy', '1');
      }
      if (origin) {
        params.set('origin', origin);
      }
      return `${YT_ORIGIN}/embed/${videoId}?${params.toString()}`;
    }, [captions, origin, shouldLoad, videoId]);

    return (
      <div className={className} style={style}>
        {shouldLoad ? (
          <iframe
            ref={iframeRef}
            id={playerId}
            title={title}
            src={embedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            onLoad={handleIframeLoad}
            className="h-full w-full"
          />
        ) : null}
      </div>
    );
  },
);

YouTube.displayName = 'YouTube';

export default YouTube;
