import React from "react";

const COMPACT_BREAKPOINT = 768;
const COMPACT_MEDIA_QUERY = `(max-width: ${COMPACT_BREAKPOINT - 1}px)`;

type DesktopModeContextValue = {
  isCompact: boolean;
  breakpoint: number;
  mediaQuery: string;
};

const DesktopModeContext = React.createContext<DesktopModeContextValue>({
  isCompact: false,
  breakpoint: COMPACT_BREAKPOINT,
  mediaQuery: COMPACT_MEDIA_QUERY,
});

const getServerSnapshot = () => false;

export const DesktopModeProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const subscribe = React.useCallback((callback: () => void) => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const mediaQueryList = window.matchMedia(COMPACT_MEDIA_QUERY);
    const handler = () => callback();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handler);
      return () => mediaQueryList.removeEventListener("change", handler);
    }

    mediaQueryList.addListener(handler);
    return () => mediaQueryList.removeListener(handler);
  }, []);

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
  }, []);

  const isCompact = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const value = React.useMemo(
    () => ({
      isCompact,
      breakpoint: COMPACT_BREAKPOINT,
      mediaQuery: COMPACT_MEDIA_QUERY,
    }),
    [isCompact],
  );

  return (
    <DesktopModeContext.Provider value={value}>
      {children}
    </DesktopModeContext.Provider>
  );
};

export const useDesktopMode = () => React.useContext(DesktopModeContext);

export const getDesktopModeBreakpoint = () => COMPACT_BREAKPOINT;

