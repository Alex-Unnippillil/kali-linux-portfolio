import Head from 'next/head';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactEventHandler,
} from 'react';
import { EMBED_FRAME_ALLOWED_ORIGINS } from '../lib/embed-origins';

const DEFAULT_TIMEOUT_MS = 8000;

const hasMatchingOrigin = (origin: string, pattern: string) => {
  if (!pattern) return false;
  const normalizedPattern = pattern.toLowerCase();
  const normalizedOrigin = origin.toLowerCase();

  if (normalizedPattern.includes('*')) {
    const domain = normalizedPattern.replace(/^https?:\/\//, '').replace(/^\*\./, '');
    return normalizedOrigin.endsWith(domain);
  }

  return normalizedOrigin === normalizedPattern;
};

const isAllowedSrc = (src: string, allowedOrigins: string[]) => {
  try {
    const url = new URL(src);
    return allowedOrigins.some((pattern) => hasMatchingOrigin(url.origin, pattern));
  } catch {
    return false;
  }
};

export type EmbedFrameProps = {
  src: string;
  title: string;
  allow?: string;
  allowFullScreen?: boolean;
  sandbox?: string;
  className?: string;
  containerClassName?: string;
  prefetch?: boolean;
  allowedOrigins?: string[];
  fallbackLabel?: string;
  openInNewTabLabel?: string;
  loadingLabel?: string;
  onLoad?: ReactEventHandler<HTMLIFrameElement>;
  onError?: ReactEventHandler<HTMLIFrameElement>;
  onBlocked?: (message: string) => void;
  timeoutMs?: number;
};

const EmbedFrame = forwardRef<HTMLIFrameElement, EmbedFrameProps>(
  (
    {
      src,
      title,
      allow,
      allowFullScreen,
      sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups',
      className,
      containerClassName,
      prefetch = false,
      allowedOrigins = EMBED_FRAME_ALLOWED_ORIGINS,
      fallbackLabel = 'Open in new tab',
      openInNewTabLabel = 'Open in new tab',
      loadingLabel = 'Loading embed…',
      onLoad,
      onError,
      onBlocked,
      timeoutMs = DEFAULT_TIMEOUT_MS,
    },
    ref,
  ) => {
    const [status, setStatus] = useState<'loading' | 'ready' | 'blocked'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const isAllowed = useMemo(() => isAllowedSrc(src, allowedOrigins), [src, allowedOrigins]);

    useImperativeHandle(ref, () => frameRef.current as HTMLIFrameElement, []);

    useEffect(() => {
      setStatus('loading');
      setErrorMessage(null);

      if (!isAllowed) {
        setStatus('blocked');
        setErrorMessage('This embed is blocked by the sandbox policy.');
        onBlocked?.('This embed is blocked by the sandbox policy.');
        return () => {};
      }

      if (typeof window === 'undefined') return () => {};

      timeoutRef.current = window.setTimeout(() => {
        setStatus((current) => (current === 'ready' ? current : 'blocked'));
        setErrorMessage('The embed did not load. It may be blocked by your browser.');
        onBlocked?.('The embed did not load. It may be blocked by your browser.');
      }, timeoutMs);

      return () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      };
    }, [isAllowed, onBlocked, timeoutMs, src]);

    const handleLoad: ReactEventHandler<HTMLIFrameElement> = (event) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setStatus('ready');
      onLoad?.(event);
    };

    const handleError: ReactEventHandler<HTMLIFrameElement> = (event) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setStatus('blocked');
      setErrorMessage('The embed was blocked from loading.');
      onBlocked?.('The embed was blocked from loading.');
      onError?.(event);
    };

    return (
      <div
        className={
          containerClassName ??
          'relative h-full w-full overflow-hidden rounded-lg border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]'
        }
      >
        {prefetch && (
          <Head>
            <link rel="prefetch" href={src} />
          </Head>
        )}
        <iframe
          ref={frameRef}
          title={title}
          src={isAllowed ? src : 'about:blank'}
          className={className ?? 'h-full w-full border-0'}
          allow={allow}
          allowFullScreen={allowFullScreen}
          sandbox={sandbox}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
        {status !== 'ready' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[color:var(--kali-overlay)]/70">
            <div className="flex flex-col items-center gap-3 text-center text-sm text-[color:var(--kali-text)]">
              {status === 'loading' && (
                <div className="flex flex-col items-center gap-2" aria-live="polite" role="status">
                  <span className="h-5 w-5 animate-spin rounded-full border border-[color:var(--color-primary)] border-t-transparent" />
                  <span>{loadingLabel}</span>
                </div>
              )}
              {status === 'blocked' && (
                <div className="flex flex-col items-center gap-2" role="alert">
                  <span>{errorMessage}</span>
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto rounded-md border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--kali-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                  >
                    {fallbackLabel}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,var(--kali-bg))] shadow-[0_12px_30px_-16px_var(--kali-blue-glow)] transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--kali-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
        >
          {openInNewTabLabel}
        </a>
      </div>
    );
  },
);

EmbedFrame.displayName = 'EmbedFrame';

export default EmbedFrame;
