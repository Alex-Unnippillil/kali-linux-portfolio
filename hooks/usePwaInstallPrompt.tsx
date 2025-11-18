"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type InstallOutcome = "accepted" | "dismissed";
type InstallPromptResult = InstallOutcome | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

interface PwaInstallContextValue {
  canInstall: boolean;
  promptInstall: () => Promise<InstallPromptResult>;
}

const defaultContext: PwaInstallContextValue = {
  canInstall: false,
  promptInstall: async () => "unavailable",
};

const PwaInstallContext = createContext<PwaInstallContextValue>(defaultContext);

const isStandaloneDisplayMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = (window.navigator as typeof window.navigator & {
    standalone?: boolean;
  }).standalone;
  const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
  return Boolean(navigatorStandalone) || Boolean(mediaQuery?.matches);
};

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      if (promptEvent.preventDefault) {
        promptEvent.preventDefault();
      }
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches);
    };

    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleDisplayModeChange);
      } else if ((mediaQuery as MediaQueryList).addListener) {
        (mediaQuery as MediaQueryList).addListener(handleDisplayModeChange);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleDisplayModeChange);
        } else if ((mediaQuery as MediaQueryList).removeListener) {
          (mediaQuery as MediaQueryList).removeListener(handleDisplayModeChange);
        }
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallPromptResult> => {
    const prompt = deferredPrompt;
    if (!prompt) {
      return "unavailable";
    }

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      return choice.outcome;
    } catch (error) {
      console.error("PWA install prompt failed", error);
      setDeferredPrompt(null);
      return "dismissed";
    }
  }, [deferredPrompt]);

  const value = useMemo<PwaInstallContextValue>(() => ({
    canInstall: Boolean(deferredPrompt) && !isStandalone,
    promptInstall,
  }), [deferredPrompt, isStandalone, promptInstall]);

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstallPrompt(): PwaInstallContextValue {
  return useContext(PwaInstallContext);
}
