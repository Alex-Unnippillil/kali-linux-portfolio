"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The Document Picture-in-Picture API is still experimental and the
// TypeScript definitions do not ship with the DOM lib yet.
interface PipPortalContextValue {
  open: (content: React.ReactNode) => Promise<Window | null>;
  close: () => void;
  isOpen: boolean;
}

export const PipPortalContext = createContext<PipPortalContextValue>({
  open: async () => null,
  close: () => {},
  isOpen: false,
});

export const usePipPortal = () => useContext(PipPortalContext);

/**
 * Provider that lets children render arbitrary content inside a
 * Document Picture-in-Picture window. The window remains controllable
 * through the returned `open` and `close` functions.
 */
const PipPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pipWindowRef = useRef<Window | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    const win = pipWindowRef.current;
    if (win && !win.closed) {
      win.close();
    }
    pipWindowRef.current = null;
    setContainer(null);
    setContent(null);
    setIsOpen(false);
  }, []);

  const open = useCallback(
    async (node: React.ReactNode) => {
      if (typeof window === 'undefined' || !window.documentPictureInPicture) return null;

      let win = pipWindowRef.current;
      if (!win || win.closed) {
        try {
          win = await window.documentPictureInPicture.requestWindow();
        } catch {
          return null;
        }
        pipWindowRef.current = win;
        setContainer(win.document.body);

        const handlePageHide = () => close();
        window.addEventListener('pagehide', handlePageHide, { once: true });
        win.addEventListener('pagehide', handlePageHide, { once: true });
      }

      setIsOpen(true);
      setContent(node);
      return win;
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
      setIsOpen(false);
    };

    win.addEventListener('unload', handleUnload);
    return () => {
      win.removeEventListener('unload', handleUnload);
    };
  }, [container]);

  return (
    <PipPortalContext.Provider value={{ open, close, isOpen }}>
      {children}
      {container && content ? createPortal(content, container) : null}
    </PipPortalContext.Provider>
  );
};

export default PipPortalProvider;

