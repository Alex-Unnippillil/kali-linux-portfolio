import Image from 'next/image';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type ActivationReason = 'interaction' | 'visible';

export type RenderOptions = {
  autoPlay: boolean;
  enableApi: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  setEnableApi: (value: boolean) => void;
};

export type KeyCommand = 'space' | 'escape';

export type KeyCommandOptions = RenderOptions & {
  iframe: HTMLIFrameElement | null;
};

interface VideoProps {
  poster: string;
  title: string;
  className?: string;
  aspectRatio?: string;
  placeholderLabel?: string;
  overlay?: ReactNode;
  loadOnVisible?: boolean;
  activateOnMount?: ActivationReason | null;
  enableApiByDefault?: boolean;
  onActivate?: (reason: ActivationReason) => void;
  onEnableApiChange?: (next: boolean) => void;
  renderEmbed: (options: RenderOptions) => ReactNode;
  onKeyCommand?: (command: KeyCommand, options: KeyCommandOptions) => void;
}

const Video: React.FC<VideoProps> = ({
  poster,
  title,
  className,
  aspectRatio = '16 / 9',
  placeholderLabel = 'Play video',
  overlay,
  loadOnVisible = true,
  activateOnMount = null,
  enableApiByDefault = false,
  onActivate,
  onEnableApiChange,
  renderEmbed,
  onKeyCommand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [enableApi, setEnableApi] = useState(enableApiByDefault);
  const hasLoadedRef = useRef(false);
  const mountActivationRef = useRef<ActivationReason | null>(null);

  const activate = useCallback(
    (reason: ActivationReason) => {
      if (reason === 'visible') {
        if (hasLoadedRef.current) {
          return;
        }
        hasLoadedRef.current = true;
        setActive(true);
        setAutoPlay(false);
        onActivate?.(reason);
        return;
      }

      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setActive(true);
      }
      setAutoPlay(true);
      setEnableApi(true);
      onActivate?.(reason);
      requestAnimationFrame(() => {
        containerRef.current?.focus();
      });
    },
    [onActivate],
  );

  useEffect(() => {
    if (!activateOnMount) {
      mountActivationRef.current = null;
      return;
    }
    if (mountActivationRef.current === activateOnMount) {
      return;
    }
    mountActivationRef.current = activateOnMount;
    activate(activateOnMount);
  }, [activateOnMount, activate]);

  useEffect(() => {
    if (!loadOnVisible) return;
    if (hasLoadedRef.current) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activate('visible');
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activate, loadOnVisible]);

  useEffect(() => {
    onEnableApiChange?.(enableApi);
  }, [enableApi, onEnableApiChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!active) {
        if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
          event.preventDefault();
          activate('interaction');
        }
        return;
      }

      if (!onKeyCommand) return;

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        onKeyCommand('space', {
          autoPlay,
          enableApi,
          iframeRef,
          setEnableApi,
          iframe: iframeRef.current,
        });
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onKeyCommand('escape', {
          autoPlay,
          enableApi,
          iframeRef,
          setEnableApi,
          iframe: iframeRef.current,
        });
      }
    },
    [activate, active, autoPlay, enableApi, onKeyCommand],
  );

  return (
    <div
      ref={containerRef}
      className={`relative isolate overflow-hidden focus:outline-none ${className ?? ''}`.trim()}
      style={{ aspectRatio }}
      tabIndex={0}
      role="group"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      {!active && (
        <button
          type="button"
          className="absolute inset-0 flex h-full w-full items-center justify-center bg-black/40 transition focus:outline-none"
          onClick={() => activate('interaction')}
          aria-label={placeholderLabel}
        >
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority={false}
          />
          <div aria-hidden className="relative z-10 flex flex-col items-center gap-2 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 68 48"
              className="drop-shadow-lg"
            >
              <path
                d="M66.52 7.43a8 8 0 00-5.62-5.66C55.47.8 34 0.8 34 0.8S12.53.8 7.1 1.77A8 8 0 001.48 7.43 83.4 83.4 0 000 24a83.4 83.4 0 001.48 16.57 8 8 0 005.62 5.66c5.43.97 26.9.97 26.9.97s21.47 0 26.9-.97a8 8 0 005.62-5.66A83.4 83.4 0 0068 24a83.4 83.4 0 00-1.48-16.57z"
                fill="#f00"
              />
              <path d="M45 24L27 14v20z" fill="#fff" />
            </svg>
            <span className="text-sm font-medium">{placeholderLabel}</span>
          </div>
        </button>
      )}

      {active && (
        <div className="absolute inset-0">
          {renderEmbed({ autoPlay, enableApi, iframeRef, setEnableApi })}
          {overlay}
        </div>
      )}
    </div>
  );
};

export default Video;
