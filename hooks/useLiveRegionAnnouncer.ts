import { RefObject, useCallback, useEffect } from 'react';

type LiveRegionElement = HTMLElement | null;

type NotificationOptionsWithBody = NotificationOptions & { body?: string };

type LiveRegionAnnouncer = {
  announce: (message: string) => void;
  announceCopy: () => void;
  announceCut: () => void;
  announcePaste: () => void;
  announceNotification: (title: string, options?: NotificationOptionsWithBody) => void;
};

const MESSAGE_DELAY_MS = 100;

const buildMessage = (title: string, options?: NotificationOptionsWithBody) => {
  if (!options?.body) return title;
  return `${title} ${options.body}`.trim();
};

const useLiveRegionAnnouncer = (
  liveRegionRef: RefObject<LiveRegionElement>,
): LiveRegionAnnouncer => {
  const announce = useCallback(
    (message: string) => {
      if (typeof window === 'undefined') return;
      if (!message) return;
      const element = liveRegionRef.current;
      if (!element) return;

      element.textContent = '';
      window.setTimeout(() => {
        if (liveRegionRef.current === element) {
          element.textContent = message;
        }
      }, MESSAGE_DELAY_MS);
    },
    [liveRegionRef],
  );

  const announceCopy = useCallback(() => announce('Copied to clipboard'), [announce]);

  const announceCut = useCallback(() => announce('Cut to clipboard'), [announce]);

  const announcePaste = useCallback(() => announce('Pasted from clipboard'), [announce]);

  const announceNotification = useCallback(
    (title: string, options?: NotificationOptionsWithBody) => {
      if (!title) return;
      announce(buildMessage(title, options));
    },
    [announce],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleCopy = () => announceCopy();
    const handleCut = () => announceCut();
    const handlePaste = () => announcePaste();

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);

    const { clipboard } = navigator;
    const originalWrite = clipboard?.writeText?.bind(clipboard);
    const originalRead = clipboard?.readText?.bind(clipboard);

    if (originalWrite) {
      clipboard.writeText = async (text) => {
        announceCopy();
        return originalWrite(text);
      };
    }

    if (originalRead) {
      clipboard.readText = async () => {
        const text = await originalRead();
        announcePaste();
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
        announceNotification(title, options);
        return new OriginalNotification(title, options);
      } as typeof Notification;

      WrappedNotification.requestPermission = OriginalNotification.requestPermission.bind(
        OriginalNotification,
      );

      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });

      WrappedNotification.prototype = OriginalNotification.prototype;
      window.Notification = WrappedNotification;
    }

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);

      if (clipboard) {
        if (originalWrite) clipboard.writeText = originalWrite;
        if (originalRead) clipboard.readText = originalRead;
      }

      if (OriginalNotification) {
        window.Notification = OriginalNotification;
      }
    };
  }, [announceCopy, announceCut, announcePaste, announceNotification]);

  return {
    announce,
    announceCopy,
    announceCut,
    announcePaste,
    announceNotification,
  };
};

export default useLiveRegionAnnouncer;
export type { LiveRegionAnnouncer };
