import { useEffect, useRef } from 'react';

type DownloadPhase = 'start' | 'complete';

type DownloadEventDetail = {
  fileName?: string;
  status?: DownloadPhase;
};

function sanitizeFileName(name: string | undefined | null): string {
  if (!name) return 'download';
  const trimmed = name.replace(/\s+/g, ' ').trim();
  return trimmed || 'download';
}

function extractFileName(anchor: HTMLAnchorElement): string {
  const explicit = anchor.getAttribute('download');
  if (explicit && explicit.trim()) return sanitizeFileName(explicit);

  const dataName = anchor.getAttribute('data-filename');
  if (dataName && dataName.trim()) return sanitizeFileName(dataName);

  const label = anchor.getAttribute('aria-label');
  if (label && label.trim()) return sanitizeFileName(label);

  const title = anchor.getAttribute('title');
  if (title && title.trim()) return sanitizeFileName(title);

  const href = anchor.getAttribute('href') ?? '';
  if (href.startsWith('blob:') || href.startsWith('data:')) {
    return 'download';
  }

  try {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.href : undefined);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return sanitizeFileName(decodeURIComponent(last));
  } catch {
    const parts = href.split(/[/?#]/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return sanitizeFileName(decodeURIComponent(last));
  }

  return 'download';
}

function shouldAnnounce(anchor: HTMLAnchorElement | null): anchor is HTMLAnchorElement {
  if (!anchor) return false;
  if (anchor.hasAttribute('data-skip-download-announcement')) return false;
  if (anchor.getAttribute('download') !== null) return true;
  const rel = anchor.getAttribute('rel');
  if (rel && /\bdownload\b/i.test(rel)) return true;
  return false;
}

const COMPLETION_DELAY = 1200;
const DUPLICATE_INTERVAL = 1500;

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const Toaster = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const downloadRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const liveRegion = liveRegionRef.current;
    if (!liveRegion) return;

    const update = (message: string) => {
      liveRegion.textContent = '';
      window.setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };

    const handleCopy = () => update('Copied to clipboard');
    const handleCut = () => update('Cut to clipboard');
    const handlePaste = () => update('Pasted from clipboard');

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);

    const { clipboard } = navigator as Navigator & {
      clipboard?: Clipboard & {
        writeText?: (text: string) => Promise<void>;
        readText?: () => Promise<string>;
      };
    };

    const originalWrite = clipboard?.writeText?.bind(clipboard);
    const originalRead = clipboard?.readText?.bind(clipboard);

    if (clipboard && originalWrite) {
      clipboard.writeText = async (text: string) => {
        update('Copied to clipboard');
        return originalWrite(text);
      };
    }

    if (clipboard && originalRead) {
      clipboard.readText = async () => {
        const text = await originalRead();
        update('Pasted from clipboard');
        return text;
      };
    }

    const OriginalNotification = window.Notification;

    if (OriginalNotification) {
      const WrappedNotification = function (
        this: Notification,
        title: string,
        options?: NotificationOptions,
      ) {
        update(`${title}${options?.body ? ` ${options.body}` : ''}`);
        return new OriginalNotification(title, options);
      } as unknown as typeof Notification;

      WrappedNotification.requestPermission = OriginalNotification.requestPermission.bind(
        OriginalNotification,
      );

      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });

      WrappedNotification.prototype = OriginalNotification.prototype;
      (window as typeof window & { Notification: typeof Notification }).Notification =
        WrappedNotification;

      return () => {
        window.removeEventListener('copy', handleCopy);
        window.removeEventListener('cut', handleCut);
        window.removeEventListener('paste', handlePaste);
        if (clipboard && originalWrite) clipboard.writeText = originalWrite;
        if (clipboard && originalRead) clipboard.readText = originalRead;
        (window as typeof window & { Notification: typeof Notification }).Notification =
          OriginalNotification;
      };
    }

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      if (clipboard && originalWrite) clipboard.writeText = originalWrite;
      if (clipboard && originalRead) clipboard.readText = originalRead;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const region = downloadRegionRef.current;
    if (!region) return;

    let lastMessage = '';
    let lastTimestamp = 0;
    const timers: number[] = [];
    const handledAnchors = new WeakMap<HTMLAnchorElement, number>();

    const announce = (message: string) => {
      const now = Date.now();
      if (message === lastMessage && now - lastTimestamp < DUPLICATE_INTERVAL) {
        return;
      }
      lastMessage = message;
      lastTimestamp = now;
      region.textContent = '';
      window.requestAnimationFrame(() => {
        region.textContent = message;
      });
    };

    const announcePhase = (fileName: string, phase: DownloadPhase) => {
      const cleanName = sanitizeFileName(fileName);
      if (!cleanName) return;
      if (phase === 'start') {
        announce(`Starting download of ${cleanName}`);
      } else {
        announce(`Finished downloading ${cleanName}`);
      }
    };

    const handleDownload = (anchor: HTMLAnchorElement) => {
      const fileName = extractFileName(anchor);
      announcePhase(fileName, 'start');
      const timer = window.setTimeout(() => {
        announcePhase(fileName, 'complete');
      }, COMPLETION_DELAY);
      timers.push(timer);
    };

    const markHandled = (anchor: HTMLAnchorElement) => {
      handledAnchors.set(anchor, now());
    };

    const wasHandledRecently = (anchor: HTMLAnchorElement) => {
      const ts = handledAnchors.get(anchor);
      return typeof ts === 'number' && now() - ts < 50;
    };

    const handleClick = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!shouldAnnounce(anchor as HTMLAnchorElement)) return;
      const link = anchor as HTMLAnchorElement;
      if (wasHandledRecently(link)) return;
      markHandled(link);
      handleDownload(link);
    };

    document.addEventListener('click', handleClick, true);

    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patchedClick(this: HTMLAnchorElement) {
      if (shouldAnnounce(this) && !wasHandledRecently(this)) {
        markHandled(this);
        handleDownload(this);
      }
      return originalClick.call(this);
    };

    const handleManualEvent = (event: Event) => {
      const detail = (event as CustomEvent<DownloadEventDetail>).detail;
      if (!detail) return;
      const { fileName, status } = detail;
      if (!fileName || (status !== 'start' && status !== 'complete')) return;
      announcePhase(fileName, status);
    };

    window.addEventListener('download-status', handleManualEvent as EventListener);

    return () => {
      document.removeEventListener('click', handleClick, true);
      HTMLAnchorElement.prototype.click = originalClick;
      window.removeEventListener('download-status', handleManualEvent as EventListener);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <>
      <div aria-live="polite" role="status" id="live-region" ref={liveRegionRef} />
      <div
        aria-live="polite"
        role="status"
        id="download-live-region"
        ref={downloadRegionRef}
      />
    </>
  );
};

export default Toaster;
