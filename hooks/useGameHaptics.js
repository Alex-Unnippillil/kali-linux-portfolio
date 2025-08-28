"use client";

import { useCallback } from 'react';
import usePersistedState from './usePersistedState';
import {
  vibrate as vibrateNative,
  patterns,
} from '../components/apps/Games/common/haptics';

// Exposes helpers for triggering game haptics with an on/off toggle.
export default function useGameHaptics() {
  const [enabled, setEnabled] = usePersistedState('game:haptics', true);

  const vibrate = useCallback(
    (pattern) => {
      if (!enabled) return;
      vibrateNative(pattern);
    },
    [enabled]
  );

  const score = useCallback(() => vibrate(patterns.score), [vibrate]);
  const danger = useCallback(() => vibrate(patterns.danger), [vibrate]);
  const gameOver = useCallback(() => vibrate(patterns.gameOver), [vibrate]);

  const toggle = useCallback(() => setEnabled((e) => !e), [setEnabled]);

  return { enabled, toggle, vibrate, score, danger, gameOver };
}
