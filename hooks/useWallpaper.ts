import { useCallback, useEffect, useRef, useState } from 'react';
import { extractAccent, AccentMetadata } from '../utils/color/extractAccent';

export interface WallpaperAccentSuggestion extends AccentMetadata {
  wallpaper: string;
  background: string;
  currentAccent: string;
}

interface UseWallpaperOptions {
  wallpaper: string;
  currentAccent: string;
  onAccentApproved?: (accent: string) => void;
  minContrast?: number;
}

const DEFAULT_BACKGROUND = '#0f1317';

const readBackgroundColor = (): string => {
  if (typeof window === 'undefined') return DEFAULT_BACKGROUND;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-bg');
  return value.trim() || DEFAULT_BACKGROUND;
};

export const useWallpaper = ({
  wallpaper,
  currentAccent,
  onAccentApproved,
  minContrast = 4.5,
}: UseWallpaperOptions) => {
  const [suggestion, setSuggestion] = useState<WallpaperAccentSuggestion | null>(null);
  const handledRef = useRef<Map<string, { accent: string; dismissed: boolean }>>(new Map());
  const previousWallpaper = useRef<string | null>(null);
  const requestRef = useRef(0);

  const currentAccentLower = currentAccent.toLowerCase();

  useEffect(() => {
    if (!wallpaper) return;
    if (typeof window === 'undefined') return;

    const handled = handledRef.current.get(wallpaper);
    if (handled && handled.accent.toLowerCase() === currentAccentLower) {
      previousWallpaper.current = wallpaper;
      return;
    }

    if (previousWallpaper.current === wallpaper) {
      return;
    }

    previousWallpaper.current = wallpaper;
    const background = readBackgroundColor();
    const requestId = ++requestRef.current;
    let cancelled = false;

    (async () => {
      try {
        const result = await extractAccent(`/wallpapers/${wallpaper}.webp`, {
          background,
          minContrast,
        });
        if (!result || cancelled || requestRef.current !== requestId) return;

        const proposed = result.color.toLowerCase();
        if (proposed === currentAccentLower) {
          handledRef.current.set(wallpaper, { accent: result.color, dismissed: false });
          setSuggestion(null);
          return;
        }

        setSuggestion({
          ...result,
          wallpaper,
          background,
          currentAccent,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Wallpaper accent extraction failed', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallpaper, currentAccentLower, minContrast]);

  const approve = useCallback(() => {
    if (!suggestion) return;
    handledRef.current.set(suggestion.wallpaper, {
      accent: suggestion.color,
      dismissed: false,
    });
    onAccentApproved?.(suggestion.color);
    setSuggestion(null);
  }, [suggestion, onAccentApproved]);

  const dismiss = useCallback(() => {
    if (suggestion) {
      handledRef.current.set(suggestion.wallpaper, {
        accent: currentAccent,
        dismissed: true,
      });
    }
    setSuggestion(null);
  }, [suggestion, currentAccent]);

  return { suggestion, approve, dismiss };
};

export default useWallpaper;
