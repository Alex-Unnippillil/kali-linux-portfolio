import { useCallback, useEffect, useRef, useState } from 'react';
import tipsData from '../data/tips.json';
import { safeLocalStorage } from '../utils/safeStorage';

export interface DailyTip {
  id: string;
  title: string;
  body: string;
}

interface StoredTipState {
  tipId: string;
  lastShown: string;
  never?: boolean;
}

const STORAGE_KEY = 'desktop.dailyTip';

const normalizeTips = () =>
  (tipsData as Array<Partial<DailyTip>>)
    .map((tip, index) => ({
      id: tip.id ?? `tip-${index + 1}`,
      title: tip.title ?? 'Daily tip',
      body: tip.body ?? '',
    }))
    .filter((tip) => tip.body.trim().length > 0);

const TIPS: DailyTip[] = normalizeTips();

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const readStoredState = (): StoredTipState | null => {
  if (!safeLocalStorage) return null;
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTipState;
    if (!parsed || typeof parsed.tipId !== 'string' || typeof parsed.lastShown !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredState = (state: StoredTipState) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
};

const getNextTip = (lastTipId?: string | null): DailyTip | null => {
  if (!TIPS.length) return null;
  if (!lastTipId) return TIPS[0];
  const index = TIPS.findIndex((tip) => tip.id === lastTipId);
  const nextIndex = index === -1 ? 0 : (index + 1) % TIPS.length;
  return TIPS[nextIndex];
};

export default function useDailyTip() {
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [optedOut, setOptedOut] = useState(false);
  const storedStateRef = useRef<StoredTipState | null>(null);

  useEffect(() => {
    const stored = readStoredState();
    storedStateRef.current = stored;

    if (stored?.never) {
      setOptedOut(true);
      return;
    }

    const today = getTodayKey();
    if (stored?.lastShown === today) {
      return;
    }

    const nextTip = getNextTip(stored?.tipId);
    if (!nextTip) {
      return;
    }

    const stateToPersist: StoredTipState = {
      tipId: nextTip.id,
      lastShown: today,
      never: false,
    };

    writeStoredState(stateToPersist);
    storedStateRef.current = stateToPersist;
    setTip(nextTip);
  }, []);

  const dismissTip = useCallback(() => {
    setTip(null);
  }, []);

  const neverShow = useCallback(() => {
    setTip(null);
    setOptedOut(true);

    const today = getTodayKey();
    const current = storedStateRef.current;
    const nextState: StoredTipState = {
      tipId: current?.tipId ?? tip?.id ?? (TIPS[0]?.id ?? 'daily-tip'),
      lastShown: current?.lastShown ?? today,
      never: true,
    };

    writeStoredState(nextState);
    storedStateRef.current = nextState;
  }, [tip]);

  return { tip, dismissTip, neverShow, optedOut };
}
