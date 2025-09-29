"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Toast from './ui/Toast';

// The Document Picture-in-Picture API is still experimental and the
// TypeScript definitions do not ship with the DOM lib yet.

interface PipPortalContextValue {
  open: (content: React.ReactNode) => Promise<void>;
  close: () => void;
}

const PipPortalContext = createContext<PipPortalContextValue>({
  open: async () => {},
  close: () => {},
});

export const usePipPortal = () => useContext(PipPortalContext);

const PipPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pipWindowRef = useRef<Window | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [copyShortcut, setCopyShortcut] = useState('Ctrl+C');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastActiveRef = useRef(false);

  const close = useCallback(() => {
    const win = pipWindowRef.current;
    if (win && !win.closed) {
      win.close();
    }
    pipWindowRef.current = null;
    setContainer(null);
    setContent(null);
  }, []);

  const open = useCallback(
    async (node: React.ReactNode) => {
      if (typeof window === 'undefined' || !window.documentPictureInPicture) return;
      let win = pipWindowRef.current;
      if (!win || win.closed) {
        try {
          win = await window.documentPictureInPicture.requestWindow();
        } catch {
          return;
        }
        pipWindowRef.current = win;
        setContainer(win.document.body);

        const handlePageHide = () => close();
        window.addEventListener('pagehide', handlePageHide, { once: true });
        win.addEventListener('pagehide', handlePageHide, { once: true });
      }
      setContent(node);
    },
    [close],
  );

  useEffect(() => {
    const win = pipWindowRef.current;
    if (!win) return;

    const handleUnload = () => {
      pipWindowRef.current = null;
      setContainer(null);
      setContent(null);
    };

    win.addEventListener('unload', handleUnload);
    return () => {
      win.removeEventListener('unload', handleUnload);
    };
  }, [container]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const platform =
      (navigator as any).userAgentData?.platform ?? navigator.platform ?? '';
    const ua = navigator.userAgent ?? '';
    const isApple = /mac|iphone|ipad|ipod/i.test(platform) || /mac|iphone|ipad|ipod/i.test(ua);
    setCopyShortcut(isApple ? 'Cmd+C' : 'Ctrl+C');
  }, []);

  const handleToastClose = useCallback(() => {
    toastActiveRef.current = false;
    setToastMessage(null);
  }, []);

  const showCopyToast = useCallback(() => {
    if (toastActiveRef.current) return;
    toastActiveRef.current = true;
    setToastMessage(`Copied to clipboard. Tip: Use ${copyShortcut}.`);
  }, [copyShortcut]);

  useEffect(() => {
    return () => {
      toastActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCopy = () => {
      showCopyToast();
    };

    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('copy', handleCopy);
    };
  }, [showCopyToast]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const clipboard = navigator.clipboard as Clipboard & { writeText?: (text: string) => Promise<void> };
    if (!clipboard || typeof clipboard.writeText !== 'function') return;

    const originalWrite = clipboard.writeText.bind(clipboard);

    const wrappedWrite = async (text: string) => {
      const result = await originalWrite(text);
      showCopyToast();
      return result;
    };

    clipboard.writeText = wrappedWrite;

    return () => {
      clipboard.writeText = originalWrite;
    };
  }, [showCopyToast]);

  return (
    <PipPortalContext.Provider value={{ open, close }}>
      {children}
      {container && content ? createPortal(content, container) : null}
      {toastMessage ? (
        <Toast message={toastMessage} onClose={handleToastClose} duration={3000} />
      ) : null}
    </PipPortalContext.Provider>
  );
};

export default PipPortalProvider;

