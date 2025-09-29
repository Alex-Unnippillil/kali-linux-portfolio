import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Video, { KeyCommandOptions, RenderOptions } from './Video';

type PosterQuality =
  | 'default'
  | 'mqdefault'
  | 'hqdefault'
  | 'sddefault'
  | 'maxresdefault';

type YouTubeProps = {
  videoId: string;
  title: string;
  className?: string;
  aspectRatio?: string;
  posterQuality?: PosterQuality;
  start?: number;
  end?: number;
  autoPlay?: boolean;
  loadOnVisible?: boolean;
};

type PlayerCommand = () => void;

const YT_ORIGIN = 'https://www.youtube-nocookie.com';

const YouTube: React.FC<YouTubeProps> = ({
  videoId,
  title,
  className,
  aspectRatio,
  posterQuality = 'hqdefault',
  start,
  end,
  autoPlay = false,
  loadOnVisible = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const pendingCommandRef = useRef<PlayerCommand | null>(null);
  const lastEnableApiRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setPlayerReady(false);
    setIsPlaying(false);
    pendingCommandRef.current = null;
  }, [videoId]);

  const poster = useMemo(
    () => `${'https://i.ytimg.com/vi/'}${videoId}/${posterQuality}.jpg`,
    [videoId, posterQuality],
  );

  const sendCommand = useCallback((command: 'playVideo' | 'pauseVideo' | 'stopVideo') => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      YT_ORIGIN,
    );
  }, []);

  const flushPending = useCallback(() => {
    if (!playerReady) return;
    const pending = pendingCommandRef.current;
    if (pending) {
      pendingCommandRef.current = null;
      pending();
    }
  }, [playerReady]);

  useEffect(() => {
    flushPending();
  }, [flushPending, playerReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      if (
        !event.origin.includes('youtube-nocookie.com') &&
        !event.origin.includes('youtube.com')
      ) {
        return;
      }

      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!data || typeof data !== 'object') return;

      switch (data.event) {
        case 'onReady':
          setPlayerReady(true);
          break;
        case 'infoDelivery': {
          const state = data?.info?.playerState;
          if (typeof state === 'number') {
            setIsPlaying(state === 1);
          }
          break;
        }
        default:
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleKeyCommand = useCallback(
    (command: 'space' | 'escape', { enableApi, setEnableApi }: KeyCommandOptions) => {
      const execute: PlayerCommand = () => {
        if (command === 'space') {
          if (isPlaying) {
            sendCommand('pauseVideo');
          } else {
            sendCommand('playVideo');
          }
        } else {
          sendCommand('stopVideo');
        }
      };

      if (!enableApi) {
        setEnableApi(true);
        pendingCommandRef.current = execute;
        return;
      }

      if (!playerReady) {
        pendingCommandRef.current = execute;
        return;
      }

      execute();
    },
    [isPlaying, playerReady, sendCommand],
  );

  const renderEmbed = useCallback(
    ({
      autoPlay: shouldAutoplay,
      enableApi,
      iframeRef: passedIframeRef,
    }: RenderOptions) => {
      if (lastEnableApiRef.current !== enableApi) {
        lastEnableApiRef.current = enableApi;
        setPlayerReady(false);
      }

      const params = new URLSearchParams({
        modestbranding: '1',
        rel: '0',
        playsinline: '1',
      });
      if (shouldAutoplay) params.set('autoplay', '1');
      if (enableApi) params.set('enablejsapi', '1');
      if (typeof start === 'number') params.set('start', Math.max(0, Math.floor(start)).toString());
      if (typeof end === 'number') params.set('end', Math.max(0, Math.floor(end)).toString());
      if (origin) params.set('origin', origin);

      const src = `${YT_ORIGIN}/embed/${videoId}?${params.toString()}`;

      return (
        <iframe
          key={`${videoId}-${enableApi ? 'api' : 'basic'}`}
          ref={(node) => {
            iframeRef.current = node;
            if (passedIframeRef) {
              (passedIframeRef as MutableRefObject<HTMLIFrameElement | null>).current = node;
            }
          }}
          title={title}
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full border-0"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          loading="lazy"
        />
      );
    },
    [end, origin, start, title, videoId],
  );

  return (
    <Video
      poster={poster}
      title={title}
      className={className}
      aspectRatio={aspectRatio}
      loadOnVisible={loadOnVisible}
      activateOnMount={autoPlay ? 'interaction' : null}
      renderEmbed={(options) => renderEmbed(options)}
      onEnableApiChange={(next) => {
        if (!next) {
          setPlayerReady(false);
          pendingCommandRef.current = null;
        }
      }}
      onKeyCommand={(command, { enableApi, setEnableApi }) =>
        handleKeyCommand(command, { enableApi, setEnableApi })
      }
    />
  );
};

export default YouTube;
