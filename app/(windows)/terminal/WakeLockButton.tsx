'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockNavigator = Navigator & {
  wakeLock: WakeLock;
};

const WakeLockButton = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [supportStatus, setSupportStatus] = useState<'unknown' | 'supported' | 'unsupported'>(
    'unknown',
  );
  const [isActive, setIsActive] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRelease = useCallback(() => {
    const current = wakeLockRef.current;

    if (current) {
      current.removeEventListener('release', handleRelease);
    }

    wakeLockRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    setSupportStatus(supported ? 'supported' : 'unsupported');
  }, []);

  useEffect(() => {
    return () => {
      const current = wakeLockRef.current;

      if (current) {
        current.removeEventListener('release', handleRelease);
        current.release().catch(() => undefined);
      }

      wakeLockRef.current = null;
    };
  }, [handleRelease]);

  const toggleWakeLock = useCallback(async () => {
    const isSupported = supportStatus === 'supported';

    if (!isSupported || isPending) {
      return;
    }

    setErrorMessage(null);

    if (wakeLockRef.current) {
      const sentinel = wakeLockRef.current;

      try {
        setIsPending(true);
        await sentinel.release();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to release wake lock.',
        );
      } finally {
        if (wakeLockRef.current) {
          handleRelease();
        }

        setIsPending(false);
      }

      return;
    }

    try {
      setIsPending(true);

      const nav = navigator as WakeLockNavigator;
      const sentinel = await nav.wakeLock.request('screen');

      wakeLockRef.current = sentinel;
      sentinel.addEventListener('release', handleRelease);
      setIsActive(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to acquire wake lock.',
      );
      wakeLockRef.current = null;
      setIsActive(false);
    } finally {
      setIsPending(false);
    }
  }, [handleRelease, isPending, supportStatus]);

  const isSupported = supportStatus === 'supported';
  const isCheckingSupport = supportStatus === 'unknown';

  const buttonLabel = supportStatus === 'unsupported'
    ? 'Wake Lock not supported'
    : isActive
    ? 'Release Wake Lock'
    : 'Keep Screen Awake';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={toggleWakeLock}
        disabled={!isSupported || isPending || isCheckingSupport}
        aria-pressed={isActive}
      >
        {buttonLabel}
      </button>
      {errorMessage ? (
        <p className="text-xs text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {supportStatus === 'unsupported' ? (
        <p className="text-xs text-zinc-300/70">
          Your browser does not support the Wake Lock API.
        </p>
      ) : null}
    </div>
  );
};

export default WakeLockButton;
