"use client";

import React, { useEffect, useMemo, useState } from 'react';

export type NetworkConnectionType = 'wifi' | 'ethernet' | 'cellular' | 'unknown';
export type NetworkSignalStrength = 'none' | 'weak' | 'medium' | 'strong';

export interface NetworkStatusSnapshot {
  isOnline: boolean;
  connectionType: NetworkConnectionType;
  signalStrength: NetworkSignalStrength;
}

const signalLabels: Record<NetworkSignalStrength, string> = {
  none: 'No signal',
  weak: 'Weak signal',
  medium: 'Fair signal',
  strong: 'Strong signal',
};

type NavigatorConnection = Navigator['connection'] & {
  mozConnection?: Navigator['connection'];
  webkitConnection?: Navigator['connection'];
};

const getNavigator = () => (typeof navigator !== 'undefined' ? navigator : undefined);

const getConnection = (): NavigatorConnection | undefined => {
  const nav = getNavigator() as Navigator & NavigatorConnection;
  if (!nav) return undefined;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
};

const coerceConnectionType = (connection?: NavigatorConnection): NetworkConnectionType => {
  if (!connection) return 'wifi';
  const { type, effectiveType } = connection as NavigatorConnection & { effectiveType?: string };
  if (type === 'ethernet') return 'ethernet';
  if (type === 'wifi') return 'wifi';
  if (typeof effectiveType === 'string' && effectiveType.toLowerCase().includes('ethernet')) {
    return 'ethernet';
  }
  if (type === 'cellular' || (typeof effectiveType === 'string' && /(2g|3g|4g|5g)/i.test(effectiveType))) {
    return 'cellular';
  }
  return 'wifi';
};

const coerceSignalStrength = (
  connection: NavigatorConnection | undefined,
  isOnline: boolean,
): NetworkSignalStrength => {
  if (!isOnline) return 'none';
  if (!connection) return 'strong';
  const downlink = typeof connection.downlink === 'number' ? connection.downlink : undefined;
  if (downlink !== undefined) {
    if (downlink >= 5) return 'strong';
    if (downlink >= 2) return 'medium';
    if (downlink > 0) return 'weak';
    return 'none';
  }
  const effectiveType = (connection as NavigatorConnection & { effectiveType?: string }).effectiveType;
  if (effectiveType) {
    const normalized = effectiveType.toLowerCase();
    if (normalized.includes('4g') || normalized.includes('5g')) return 'strong';
    if (normalized.includes('3g')) return 'medium';
    if (normalized.includes('2g')) return 'weak';
  }
  return 'strong';
};

const buildStatusSnapshot = (): NetworkStatusSnapshot => {
  const nav = getNavigator();
  const connection = getConnection();
  const isOnline = nav?.onLine ?? true;
  return {
    isOnline,
    connectionType: isOnline ? coerceConnectionType(connection) : 'wifi',
    signalStrength: coerceSignalStrength(connection, isOnline),
  };
};

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatusSnapshot>(() => buildStatusSnapshot());

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const updateStatus = () => {
      setStatus((prev) => {
        const next = buildStatusSnapshot();
        return prev.isOnline === next.isOnline &&
          prev.connectionType === next.connectionType &&
          prev.signalStrength === next.signalStrength
          ? prev
          : next;
      });
    };

    const connection = getConnection();
    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    connection?.addEventListener?.('change', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      connection?.removeEventListener?.('change', updateStatus);
    };
  }, []);

  return status;
};

interface SharedProps {
  allowNetwork?: boolean;
  showOfflineBadge?: boolean;
  size?: 'default' | 'small';
  className?: string;
}

interface IconProps extends SharedProps {
  status: NetworkStatusSnapshot;
}

const NetworkIcon = ({
  status,
  allowNetwork = true,
  showOfflineBadge = true,
  size = 'default',
  className,
}: IconProps) => {
  const iconSize = size === 'small' ? 12 : 16;
  const iconClass = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
  const title = useMemo(() => {
    if (!status.isOnline) return 'Offline';
    const baseLabel =
      status.connectionType === 'ethernet'
        ? 'Connected (Ethernet)'
        : `Connected (${signalLabels[status.signalStrength]})`;
    if (!allowNetwork) {
      return `${baseLabel} – requests blocked`;
    }
    return baseLabel;
  }, [status, allowNetwork]);

  const renderWifiIcon = (strength: NetworkSignalStrength) => {
    const levels: Record<NetworkSignalStrength, number> = {
      none: 0,
      weak: 1,
      medium: 2,
      strong: 3,
    };
    const level = levels[strength];
    return (
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        className={`${iconClass} text-current`}
        aria-hidden
      >
        {level >= 1 && (
          <path
            d="M9.5 16a3.5 3.5 0 015 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}
        {level >= 2 && (
          <path
            d="M6.3 12.8a7.8 7.8 0 0111.4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}
        {level >= 3 && (
          <path
            d="M3.2 9.2a12.4 12.4 0 0117.6 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}
        {level >= 1 && <circle cx={12} cy={19} r={1.4} fill="currentColor" />}
      </svg>
    );
  };

  const renderEthernetIcon = () => (
    <svg
      viewBox="0 0 24 24"
      width={iconSize}
      height={iconSize}
      className={`${iconClass} text-current`}
      aria-hidden
    >
      <rect
        x={4.5}
        y={3.5}
        width={15}
        height={9}
        rx={1.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <rect x={7} y={6} width={3} height={4} fill="currentColor" rx={0.6} />
      <rect x={14} y={6} width={3} height={4} fill="currentColor" rx={0.6} />
      <path
        d="M9 12.5V17a3 3 0 003 3 3 3 0 003-3v-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );

  const renderOfflineIcon = () => (
    <svg
      viewBox="0 0 24 24"
      width={iconSize}
      height={iconSize}
      className={`${iconClass} text-current`}
      aria-hidden
    >
      <circle
        cx={12}
        cy={12}
        r={7.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <line
        x1={7}
        y1={7}
        x2={17}
        y2={17}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );

  const icon = !status.isOnline
    ? renderOfflineIcon()
    : status.connectionType === 'ethernet'
    ? renderEthernetIcon()
    : renderWifiIcon(status.signalStrength);

  const containerClasses = [
    'relative inline-flex items-center',
    showOfflineBadge ? 'gap-1.5' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={containerClasses} title={title} aria-label={title}>
      <span className="relative inline-flex items-center justify-center">
        {icon}
        {!allowNetwork && status.isOnline && (
          <span
            className={`${
              size === 'small' ? 'w-1.5 h-1.5 -top-0.5 -right-0.5' : 'w-2 h-2 -top-1 -right-1'
            } absolute rounded-full bg-red-500`}
          />
        )}
      </span>
      {showOfflineBadge && !status.isOnline && (
        <span
          className={`${
            size === 'small'
              ? 'px-1 py-0.5 text-[9px]'
              : 'px-1.5 py-0.5 text-[11px]'
          } rounded bg-red-600 text-white font-semibold uppercase tracking-wide`}
        >
          Offline
        </span>
      )}
    </span>
  );
};

const NetworkTrayIcon = (props: SharedProps) => {
  const status = useNetworkStatus();
  return <NetworkIcon status={status} {...props} />;
};

export const NetworkStatusIcon = (props: IconProps) => <NetworkIcon {...props} />;

export default NetworkTrayIcon;
