import { useMemo } from 'react';
import { useSettings } from './useSettings';
import {
  ensureContrastWarning,
  normalizeHex,
  pickReadableTextColor,
} from '../utils/color';

const MIN_CONTRAST = 4.5;

interface AccentAnalyticsOptions {
  accentOverride?: string;
  minimumContrast?: number;
}

interface AccentAnalyticsResult {
  accent: string;
  accentText: string;
  contrastRatio: number;
  isAccessible: boolean;
  warning: string | null;
  liveMessage: string;
  priorityTokens: Record<'high' | 'medium' | 'low', string>;
  surfaceTokens: Record<'card' | 'cardBorder' | 'cardText' | 'cardMuted', string>;
}

const PRIORITY_TOKENS: Record<'high' | 'medium' | 'low', string> = {
  high: 'color-mix(in srgb, var(--color-severity-high) 94%, transparent)',
  medium: 'color-mix(in srgb, var(--color-severity-medium) 92%, transparent)',
  low: 'color-mix(in srgb, var(--color-severity-low) 92%, transparent)',
};

const SURFACE_TOKENS: Record<'card' | 'cardBorder' | 'cardText' | 'cardMuted', string> = {
  card: 'var(--color-surface-raised)',
  cardBorder: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
  cardText: 'var(--color-text)',
  cardMuted: 'var(--kali-text-muted)',
};

export function useAccentColorAnalytics(
  options: AccentAnalyticsOptions = {},
): AccentAnalyticsResult {
  const { accent: settingsAccent } = useSettings();
  const accent = useMemo(
    () => normalizeHex(options.accentOverride ?? settingsAccent),
    [options.accentOverride, settingsAccent],
  );

  const accentText = useMemo(() => pickReadableTextColor(accent), [accent]);

  const { ratio, isAccessible, message } = useMemo(
    () => ensureContrastWarning(accentText, accent, options.minimumContrast ?? MIN_CONTRAST),
    [accent, accentText, options.minimumContrast],
  );

  const warning = message;

  const liveMessage = useMemo(() => {
    const status = isAccessible ? 'passes' : 'fails';
    return `Contrast ratio ${ratio.toFixed(2)}:1 ${status} accessibility guidelines.`;
  }, [isAccessible, ratio]);

  return {
    accent,
    accentText,
    contrastRatio: ratio,
    isAccessible,
    warning,
    liveMessage,
    priorityTokens: PRIORITY_TOKENS,
    surfaceTokens: SURFACE_TOKENS,
  };
}

export type { AccentAnalyticsResult };
