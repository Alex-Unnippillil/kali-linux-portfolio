import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: PictureInPictureWindowOptions) => Promise<Window>;
    };
  }

  interface PictureInPictureWindowOptions {
    width?: number;
    height?: number;
  }
}

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

  return (
    <PipPortalContext.Provider value={{ open, close }}>
      {children}
      {container && content ? createPortal(content, container) : null}
    </PipPortalContext.Provider>
  );
};

export default PipPortalProvider;

