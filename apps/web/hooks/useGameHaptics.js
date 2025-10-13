"use client";

import { useCallback } from 'react';
import { useSettings } from './useSettings';
import {
  vibrate as vibrateNative,
  patterns,
  supportsVibration,
} from '../components/apps/Games/common/haptics';

// Exposes helpers for triggering game haptics with an on/off toggle.
export default function useGameHaptics() {
  const { haptics: enabled, setHaptics } = useSettings();

  const vibrate = useCallback(
    (pattern) => {
      if (!enabled || !supportsVibration()) return;
      vibrateNative(pattern);
    },
    [enabled]
  );

  const score = useCallback(() => vibrate(patterns.score), [vibrate]);
  const danger = useCallback(() => vibrate(patterns.danger), [vibrate]);
  const gameOver = useCallback(() => vibrate(patterns.gameOver), [vibrate]);

  const toggle = useCallback(() => setHaptics(!enabled), [setHaptics, enabled]);

  return { enabled, toggle, vibrate, score, danger, gameOver };
}
