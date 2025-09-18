import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface RouterProfile {
  id: string;
  label: string;
  /**
   * Number of failed attempts before the router locks WPS.
   * Use Infinity for routers that never lock.
   */
  lockAttempts: number;
  /**
   * Lock duration in seconds once the threshold is hit.
   */
  lockDuration: number;
}

export const ROUTER_PROFILES: RouterProfile[] = [
  {
    id: 'generic',
    label: 'Generic (no lockout)',
    lockAttempts: Infinity,
    lockDuration: 0,
  },
  {
    id: 'netgear',
    label: 'Netgear — lock after 5 attempts for 60s',
    lockAttempts: 5,
    lockDuration: 60,
  },
  {
    id: 'tplink',
    label: 'TP-Link — lock after 3 attempts for 300s',
    lockAttempts: 3,
    lockDuration: 300,
  },
];

export interface LockState {
  locked: boolean;
  remainingSeconds: number;
  apId: string | null;
}

interface RouterProfilesProps {
  attempts: number;
  activeApId?: string;
  activeApLabel?: string;
  onChange: (profile: RouterProfile) => void;
  onLockStateChange?: (state: LockState) => void;
}

const STORAGE_KEY = 'reaver-router-profile';
const DEFAULT_AP_ID = 'global-ap';

interface LockDisplayState {
  locked: boolean;
  remainingSeconds: number;
  key: string | null;
}

const RouterProfiles: React.FC<RouterProfilesProps> = ({
  attempts,
  activeApId,
  activeApLabel,
  onChange,
  onLockStateChange,
}) => {
  const [selected, setSelected] = useState<RouterProfile>(ROUTER_PROFILES[0]);
  const [attemptsByKey, setAttemptsByKey] = useState<Record<string, number>>({});
  const attemptsRef = useRef<Record<string, number>>({});
  const prevAttemptsRef = useRef(attempts);
  const lockoutsRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lockDisplay, setLockDisplay] = useState<LockDisplayState>({
    locked: false,
    remainingSeconds: 0,
    key: null,
  });
  const lastNotificationRef = useRef<LockState>({
    locked: false,
    remainingSeconds: 0,
    apId: null,
  });

  const apIdentifier = useMemo(
    () => `${activeApId ?? DEFAULT_AP_ID}::${selected.id}`,
    [activeApId, selected.id],
  );

  const apLabel = activeApLabel ?? 'the selected access point';

  const setAttemptValue = useCallback((key: string, value: number) => {
    setAttemptsByKey((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      const next = { ...prev, [key]: value };
      attemptsRef.current = next;
      return next;
    });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateDisplay = useCallback(
    (locked: boolean, seconds: number, key: string | null) => {
      setLockDisplay((prev) => {
        const normalizedKey = locked ? key : null;
        if (
          prev.locked === locked &&
          prev.remainingSeconds === seconds &&
          prev.key === normalizedKey
        ) {
          return prev;
        }
        return {
          locked,
          remainingSeconds: seconds,
          key: normalizedKey,
        };
      });

      const last = lastNotificationRef.current;
      if (
        last.locked !== locked ||
        last.remainingSeconds !== seconds ||
        last.apId !== key
      ) {
        const nextState: LockState = {
          locked,
          remainingSeconds: seconds,
          apId: key,
        };
        lastNotificationRef.current = nextState;
        onLockStateChange?.(nextState);
      }
    },
    [onLockStateChange],
  );

  const startTimerForKey = useCallback(
    (key: string, unlockAt: number) => {
      clearTimer();

      const tick = () => {
        const now =
          typeof performance !== 'undefined' ? performance.now() : Date.now();
        const remainingMs = unlockAt - now;
        if (remainingMs <= 0) {
          clearTimer();
          delete lockoutsRef.current[key];
          updateDisplay(false, 0, key);
          setAttemptValue(key, 0);
          return;
        }

        const seconds = Math.ceil(remainingMs / 1000);
        updateDisplay(true, seconds, key);
      };

      tick();
      timerRef.current = setInterval(tick, 250);
    },
    [clearTimer, setAttemptValue, updateDisplay],
  );

  // Load persisted profile on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const profile =
      ROUTER_PROFILES.find((p) => p.id === stored) || ROUTER_PROFILES[0];
    setSelected(profile);
    onChange(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    const prev = prevAttemptsRef.current;
    const delta = attempts - prev;
    prevAttemptsRef.current = attempts;

    const key = apIdentifier;

    if (delta < 0) {
      setAttemptValue(key, Math.max(0, attempts));
      return;
    }

    if (delta === 0) {
      return;
    }

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const unlockAt = lockoutsRef.current[key];
    if (unlockAt && unlockAt > now) {
      // Locked - ignore new attempts during cooldown
      return;
    }

    if (selected.lockAttempts === Infinity) {
      setAttemptValue(key, (attemptsRef.current[key] ?? 0) + delta);
      return;
    }

    const current = attemptsRef.current[key] ?? 0;
    const next = current + delta;

    if (next >= selected.lockAttempts) {
      const limited = selected.lockAttempts;
      setAttemptValue(key, limited);
      if (selected.lockDuration > 0) {
        const cooldownUntil = now + selected.lockDuration * 1000;
        lockoutsRef.current[key] = cooldownUntil;
        startTimerForKey(key, cooldownUntil);
      } else {
        delete lockoutsRef.current[key];
        updateDisplay(false, 0, key);
        setAttemptValue(key, 0);
      }
    } else {
      setAttemptValue(key, next);
    }
  }, [
    attempts,
    apIdentifier,
    selected.lockAttempts,
    selected.lockDuration,
    setAttemptValue,
    startTimerForKey,
    updateDisplay,
  ]);

  useEffect(() => {
    const unlockAt = lockoutsRef.current[apIdentifier];
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (unlockAt && unlockAt > now) {
      startTimerForKey(apIdentifier, unlockAt);
    } else {
      if (unlockAt) {
        delete lockoutsRef.current[apIdentifier];
      }
      clearTimer();
      updateDisplay(false, 0, apIdentifier);
    }
  }, [apIdentifier, clearTimer, startTimerForKey, updateDisplay]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profile = ROUTER_PROFILES.find((p) => p.id === e.target.value)!;
    setSelected(profile);
    window.localStorage.setItem(STORAGE_KEY, profile.id);
    onChange(profile);
  };

  const currentAttempts = attemptsByKey[apIdentifier] ?? 0;
  const totalAttempts = selected.lockAttempts;

  return (
    <div className="mb-4">
      <label htmlFor="router-profile" className="block text-sm mb-1">
        Router Vendor Profile
      </label>
      <select
        id="router-profile"
        className="p-2 rounded bg-gray-800 text-white"
        value={selected.id}
        onChange={handleChange}
      >
        {ROUTER_PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {selected.lockAttempts !== Infinity && (
        <p className="text-xs text-gray-400 mt-1">
          Locks after {selected.lockAttempts} failed attempts for{' '}
          {selected.lockDuration}s
        </p>
      )}
      {selected.lockAttempts !== Infinity && (
        <p className="text-xs text-gray-400 mt-1">
          Attempts on {apLabel}: {currentAttempts} / {totalAttempts}
        </p>
      )}
      {selected.lockAttempts === Infinity && (
        <p className="text-xs text-gray-400 mt-1">No WPS lockout behaviour</p>
      )}
      {lockDisplay.locked && lockDisplay.key === apIdentifier && (
        <div className="mt-2 rounded border border-yellow-600 bg-yellow-900/40 px-3 py-2 text-xs text-yellow-200">
          WPS temporarily locked on {apLabel}. Cooldown:{' '}
          {lockDisplay.remainingSeconds}s
        </div>
      )}
    </div>
  );
};

export default RouterProfiles;
