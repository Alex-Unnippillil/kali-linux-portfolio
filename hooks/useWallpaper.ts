import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './useSettings';
import {
  AccentAnalysis,
  extractAccent,
} from '../utils/color/extractAccent';

export type WallpaperStatus = 'idle' | 'loading' | 'ready' | 'error';

interface WallpaperState {
  analysis: AccentAnalysis | null;
  status: WallpaperStatus;
  error: string | null;
  promptOpen: boolean;
}

const initialState: WallpaperState = {
  analysis: null,
  status: 'idle',
  error: null,
  promptOpen: false,
};

export const useWallpaper = () => {
  const { wallpaper, accent, setAccent } = useSettings();
  const [state, setState] = useState<WallpaperState>(initialState);
  const requestRef = useRef(0);
  const dismissedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!wallpaper || typeof window === 'undefined') {
      setState(initialState);
      return;
    }

    const requestId = ++requestRef.current;
    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
      promptOpen: false,
    }));

    extractAccent(wallpaper)
      .then((analysis) => {
        if (requestRef.current !== requestId) return;
        setState((prev) => {
          const nextPrompt = shouldPromptUpdate({
            analysis,
            accent,
            wallpaper,
            dismissed: dismissedRef.current,
          });
          return {
            analysis,
            status: 'ready',
            error: null,
            promptOpen: nextPrompt,
          };
        });
      })
      .catch((error: unknown) => {
        if (requestRef.current !== requestId) return;
        setState({
          analysis: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Accent extraction failed',
          promptOpen: false,
        });
        console.error('Failed to analyse wallpaper', error);
      });

  }, [wallpaper, accent]);

  const accentCandidate = state.analysis?.accent ?? null;
  const shouldPrompt = useMemo(
    () =>
      shouldPromptUpdate({
        analysis: state.analysis,
        accent,
        wallpaper,
        dismissed: dismissedRef.current,
      }),
    [state.analysis, accent, wallpaper],
  );

  useEffect(() => {
    setState((prev) =>
      prev.promptOpen === shouldPrompt ? prev : { ...prev, promptOpen: shouldPrompt },
    );
  }, [shouldPrompt]);

  const acceptAccent = useCallback(() => {
    if (!accentCandidate) return;
    setAccent(accentCandidate);
    if (wallpaper) {
      delete dismissedRef.current[wallpaper];
    }
    setState((prev) => ({ ...prev, promptOpen: false }));
  }, [accentCandidate, setAccent, wallpaper]);

  const dismissAccent = useCallback(() => {
    if (accentCandidate && wallpaper) {
      dismissedRef.current[wallpaper] = accentCandidate.toLowerCase();
    }
    setState((prev) => ({ ...prev, promptOpen: false }));
  }, [accentCandidate, wallpaper]);

  const needsOverlay = state.analysis?.needsOverlay ?? false;

  return {
    wallpaper,
    accent,
    accentCandidate,
    needsOverlay,
    palette: state.analysis?.palette ?? [],
    status: state.status,
    error: state.error,
    promptOpen: state.promptOpen && Boolean(accentCandidate),
    acceptAccent,
    dismissAccent,
  };
};

interface PromptCheck {
  analysis: AccentAnalysis | null;
  accent: string;
  wallpaper: string;
  dismissed: Record<string, string>;
}

const shouldPromptUpdate = ({
  analysis,
  accent,
  wallpaper,
  dismissed,
}: PromptCheck): boolean => {
  if (!analysis || !analysis.accent || !wallpaper) return false;
  if (analysis.accent.toLowerCase() === accent.toLowerCase()) return false;
  const dismissedAccent = dismissed[wallpaper];
  if (dismissedAccent && dismissedAccent === analysis.accent.toLowerCase()) {
    return false;
  }
  return true;
};
