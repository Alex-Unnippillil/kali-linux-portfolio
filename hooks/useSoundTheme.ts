'use client';

import { useCallback, useMemo } from 'react';
import useGameAudio from './useGameAudio';

export type ToastCategory = 'info' | 'success' | 'warning' | 'error';
export type SoundBand = 'low' | 'mid' | 'soft';
export type SoundThemeId = 'stealth' | 'pulse' | 'analog';

export interface ToneShape {
  frequency: number;
  waveform: OscillatorType;
  duration: number;
  volume: number;
  attack?: number;
  release?: number;
}

export interface PreviewShape {
  waveform: OscillatorType;
  amplitude: number;
  color: string;
  band: SoundBand;
}

export interface SoundThemeDefinition {
  id: SoundThemeId;
  label: string;
  description: string;
  tones: Record<SoundBand, ToneShape>;
  preview: PreviewShape[];
}

export const CATEGORY_TO_BAND: Record<ToastCategory, SoundBand> = {
  error: 'low',
  warning: 'mid',
  info: 'soft',
  success: 'soft',
};

export const SOUND_THEMES: SoundThemeDefinition[] = [
  {
    id: 'stealth',
    label: 'Stealth Sweep',
    description: 'Rounded sine swells that stay out of the way but remain audible.',
    tones: {
      low: { frequency: 220, waveform: 'sine', duration: 0.45, volume: 0.8, attack: 0.04, release: 0.32 },
      mid: { frequency: 392, waveform: 'triangle', duration: 0.38, volume: 0.7, attack: 0.03, release: 0.24 },
      soft: { frequency: 587, waveform: 'sine', duration: 0.28, volume: 0.55, attack: 0.02, release: 0.2 },
    },
    preview: [
      { waveform: 'sine', amplitude: 0.55, color: '#38bdf8', band: 'soft' },
      { waveform: 'triangle', amplitude: 0.75, color: '#fbbf24', band: 'mid' },
      { waveform: 'sine', amplitude: 0.95, color: '#f97316', band: 'low' },
    ],
  },
  {
    id: 'pulse',
    label: 'Digital Pulse',
    description: 'Tighter square and saw accents for high-energy system feedback.',
    tones: {
      low: { frequency: 196, waveform: 'sawtooth', duration: 0.32, volume: 0.85, attack: 0.015, release: 0.18 },
      mid: { frequency: 329, waveform: 'square', duration: 0.26, volume: 0.75, attack: 0.01, release: 0.16 },
      soft: { frequency: 523, waveform: 'square', duration: 0.2, volume: 0.6, attack: 0.01, release: 0.12 },
    },
    preview: [
      { waveform: 'square', amplitude: 0.6, color: '#60a5fa', band: 'soft' },
      { waveform: 'square', amplitude: 0.8, color: '#c084fc', band: 'mid' },
      { waveform: 'sawtooth', amplitude: 1, color: '#f87171', band: 'low' },
    ],
  },
  {
    id: 'analog',
    label: 'Analog Chime',
    description: 'Gentle triangle bells layered with airy overtones.',
    tones: {
      low: { frequency: 247, waveform: 'triangle', duration: 0.5, volume: 0.7, attack: 0.05, release: 0.36 },
      mid: { frequency: 415, waveform: 'sine', duration: 0.42, volume: 0.65, attack: 0.03, release: 0.28 },
      soft: { frequency: 659, waveform: 'triangle', duration: 0.34, volume: 0.5, attack: 0.025, release: 0.24 },
    },
    preview: [
      { waveform: 'triangle', amplitude: 0.5, color: '#34d399', band: 'soft' },
      { waveform: 'sine', amplitude: 0.7, color: '#f59e0b', band: 'mid' },
      { waveform: 'triangle', amplitude: 0.9, color: '#fb7185', band: 'low' },
    ],
  },
];

const SOUND_THEME_MAP: Record<string, SoundThemeDefinition> = SOUND_THEMES.reduce(
  (map, theme) => ({ ...map, [theme.id]: theme }),
  {} as Record<string, SoundThemeDefinition>,
);

export const DEFAULT_SOUND_THEME_ID: SoundThemeId = 'stealth';

export interface ResolvedTone extends ToneShape {
  band: SoundBand;
}

export const resolveTone = (themeId: string, category: ToastCategory): ResolvedTone => {
  const theme = SOUND_THEME_MAP[themeId] ?? SOUND_THEME_MAP[DEFAULT_SOUND_THEME_ID];
  const band = CATEGORY_TO_BAND[category] ?? 'soft';
  const tone = theme.tones[band];
  return { ...tone, band };
};

interface UseSoundThemeOptions {
  themeId?: string;
  volumeMultiplier?: number;
  enabled?: boolean;
}

export const useSoundTheme = ({
  themeId = DEFAULT_SOUND_THEME_ID,
  volumeMultiplier = 1,
  enabled = true,
}: UseSoundThemeOptions = {}) => {
  const { playTone } = useGameAudio();

  const resolvedTheme = useMemo(() => SOUND_THEME_MAP[themeId] ?? SOUND_THEME_MAP[DEFAULT_SOUND_THEME_ID], [themeId]);

  const playCategoryTone = useCallback(
    (category: ToastCategory) => {
      if (!enabled || !playTone) return;
      const tone = resolveTone(resolvedTheme.id, category);
      playTone({
        frequency: tone.frequency,
        type: tone.waveform,
        duration: tone.duration,
        volume: tone.volume,
        volumeMultiplier,
        attack: tone.attack,
        release: tone.release,
      });
    },
    [enabled, playTone, resolvedTheme.id, volumeMultiplier],
  );

  const previewTheme = useCallback(
    (overrideId?: string) => {
      if (!enabled || !playTone) return;
      const themeToPreview = SOUND_THEME_MAP[overrideId ?? resolvedTheme.id] ?? SOUND_THEME_MAP[DEFAULT_SOUND_THEME_ID];
      const sequence: ToastCategory[] = ['success', 'info', 'warning', 'error'];
      sequence.forEach((category, index) => {
        const tone = resolveTone(themeToPreview.id, category);
        const delay = index * 180;
        setTimeout(() => {
          playTone({
            frequency: tone.frequency,
            type: tone.waveform,
            duration: tone.duration,
            volume: tone.volume,
            volumeMultiplier,
            attack: tone.attack,
            release: tone.release,
          });
        }, delay);
      });
    },
    [enabled, playTone, resolvedTheme.id, volumeMultiplier],
  );

  const resolveCategoryTone = useCallback(
    (category: ToastCategory) => resolveTone(resolvedTheme.id, category),
    [resolvedTheme.id],
  );

  return {
    theme: resolvedTheme,
    playCategoryTone,
    previewTheme,
    resolveCategoryTone,
  };
};

export type UseSoundThemeReturn = ReturnType<typeof useSoundTheme>;
