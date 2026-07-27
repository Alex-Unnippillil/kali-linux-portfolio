'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: WakeLockType) => Promise<WakeLockSentinel>;
  };
};

type WakeLockType = 'screen';

const getNavigatorWithWakeLock = (): WakeLockNavigator | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const nav = navigator as WakeLockNavigator;

  if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
    return null;
  }

  return nav;
};

export interface WakeLockButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  activeLabel?: React.ReactNode;
  inactiveLabel?: React.ReactNode;
  unsupportedLabel?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const WakeLockButton: React.FC<WakeLockButtonProps> = ({
  activeLabel = 'Release wake lock',
  inactiveLabel = 'Keep screen awake',
  unsupportedLabel = 'Wake lock unsupported',
  disabled,
  children,
  onClick,
  type = 'button',
  ...rest
}) => {
  const [sentinel, setSentinel] = useState<WakeLockSentinel | null>(null);
  const [supported, setSupported] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setSupported(getNavigatorWithWakeLock() !== null);
  }, []);

  useEffect(() => {
    sentinelRef.current = sentinel;
  }, [sentinel]);

  useEffect(() => {
    const current = sentinel;
    if (!current) {
      return;
    }

    const handleRelease = () => {
      setSentinel((active) => (active === current ? null : active));
    };

    current.addEventListener('release', handleRelease);

    return () => {
      current.removeEventListener('release', handleRelease);
    };
  }, [sentinel]);

  useEffect(() => () => {
    if (sentinelRef.current) {
      sentinelRef.current.release().catch(() => {});
      sentinelRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        onClick(event);
      }

      if (event.defaultPrevented) {
        return;
      }

      const nav = getNavigatorWithWakeLock();
      if (!nav) {
        setSupported(false);
        return;
      }

      if (sentinel) {
        try {
          await sentinel.release();
        } catch {
          // Ignore release errors; wake lock will be cleared below
        } finally {
          setSentinel(null);
        }
        return;
      }

      try {
        const newSentinel = await nav.wakeLock!.request('screen');
        setSentinel(newSentinel);
      } catch {
        setSentinel(null);
      }
    },
    [onClick, sentinel],
  );

  const label = useMemo(() => {
    if (!supported) {
      return unsupportedLabel;
    }

    return sentinel ? activeLabel : inactiveLabel;
  }, [supported, sentinel, activeLabel, inactiveLabel, unsupportedLabel]);

  return (
    <button
      {...rest}
      type={type}
      onClick={handleClick}
      disabled={disabled ?? !supported}
      aria-pressed={Boolean(sentinel)}
    >
      {children ?? label}
    </button>
  );
};

export default WakeLockButton;
