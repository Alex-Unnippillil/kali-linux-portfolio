import { useEffect, useRef, useState } from 'react';

type PolitenessSetting = 'polite' | 'assertive';

export type ToasterEventDetail = {
  message?: string;
  politeness?: PolitenessSetting;
};

const ANNOUNCE_EVENT = 'system:announce';

const ANNOUNCEMENT_DELAY = 60;
const CLEAR_DELAY = 2000;
const DOWNLOAD_COMPLETE_DELAY = 1500;

export const announcePolite = (message: string) => {
  if (typeof window === 'undefined' || !message) return;
  const event = new CustomEvent<ToasterEventDetail>(ANNOUNCE_EVENT, {
    detail: { message, politeness: 'polite' },
  });
  window.dispatchEvent(event);
};

const resolveFileName = (anchor: HTMLAnchorElement): string => {
  const explicit = anchor.getAttribute('download');
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  const href = anchor.getAttribute('href') ?? '';
  if (!href) return 'download';

  try {
    const url = new URL(href, window.location.href);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  } catch {
    // ignore parsing issues
  }

  if (href.startsWith('blob:')) return 'file';

  const fallback = href.split('/').filter(Boolean).pop();
  return fallback ?? 'download';
};

const Toaster = () => {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<PolitenessSetting>('polite');
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const downloadTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const registerMessageTimer = (timer: ReturnType<typeof setTimeout>) => {
    messageTimers.current.push(timer);
    return timer;
  };

  const cancelMessageTimers = () => {
    messageTimers.current.forEach((timer) => clearTimeout(timer));
    messageTimers.current = [];
    clearTimer.current = null;
  };

  const registerDownloadTimer = (timer: ReturnType<typeof setTimeout>) => {
    downloadTimers.current.push(timer);
    return timer;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<ToasterEventDetail>).detail;
      const nextMessage = detail?.message?.trim();
      if (!nextMessage) return;

      cancelMessageTimers();

      setMessage('');
      setPoliteness(detail.politeness ?? 'polite');

      const showTimer = window.setTimeout(() => {
        setMessage(nextMessage);
        messageTimers.current = messageTimers.current.filter((timer) => timer !== showTimer);
      }, ANNOUNCEMENT_DELAY);
      registerMessageTimer(showTimer);

      const hideTimer = window.setTimeout(() => {
        setMessage('');
        clearTimer.current = null;
        messageTimers.current = messageTimers.current.filter((timer) => timer !== hideTimer);
      }, CLEAR_DELAY + ANNOUNCEMENT_DELAY);
      clearTimer.current = registerMessageTimer(hideTimer);
    };

    window.addEventListener(ANNOUNCE_EVENT, handleAnnounce as EventListener);

    return () => {
      window.removeEventListener(ANNOUNCE_EVENT, handleAnnounce as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleDownload = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a[download]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const fileName = resolveFileName(anchor);
      announcePolite(`Download started: ${fileName}`);

      const completionTimer = window.setTimeout(() => {
        announcePolite(`Download complete: ${fileName}`);
        downloadTimers.current = downloadTimers.current.filter((timer) => timer !== completionTimer);
      }, DOWNLOAD_COMPLETE_DELAY);
      registerDownloadTimer(completionTimer);
    };

    document.addEventListener('click', handleDownload, true);

    return () => {
      document.removeEventListener('click', handleDownload, true);
    };
  }, []);

  useEffect(() => {
    return () => {
      cancelMessageTimers();
      downloadTimers.current.forEach((timer) => clearTimeout(timer));
      downloadTimers.current = [];
    };
  }, []);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      data-testid="system-toaster"
    >
      {message}
    </div>
  );
};

export default Toaster;
