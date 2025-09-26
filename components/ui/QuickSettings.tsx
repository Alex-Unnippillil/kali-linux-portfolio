"use client";

import { useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  NetworkStatusSnapshot,
  useNetworkStatus,
  NetworkSignalStrength,
  NetworkStatusIcon,
} from '../util-components/network-tray-icon';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

interface DemoNetwork {
  id: string;
  ssid: string;
  status: string;
  iconStatus: NetworkStatusSnapshot;
  isActive?: boolean;
}

const signalDescription: Record<NetworkSignalStrength, string> = {
  none: 'no signal',
  weak: 'weak signal',
  medium: 'fair signal',
  strong: 'strong signal',
};

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const networkStatus = useNetworkStatus();
  const { allowNetwork, setAllowNetwork } = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const connectionSummary = networkStatus.isOnline
    ? networkStatus.connectionType === 'ethernet'
      ? 'Ethernet connected'
      : `Wi-Fi ${signalDescription[networkStatus.signalStrength]}`
    : 'Offline mode';

  const demoNetworks = useMemo<DemoNetwork[]>(() => {
    const primarySsid = networkStatus.connectionType === 'ethernet' ? 'Wired connection 1' : 'Unnippillil HQ';
    const primaryStatus = networkStatus.isOnline
      ? allowNetwork
        ? 'Connected'
        : 'Connected (requests blocked)'
      : 'Offline';

    return [
      {
        id: 'primary',
        ssid: primarySsid,
        status: primaryStatus,
        iconStatus: {
          isOnline: networkStatus.isOnline,
          connectionType: networkStatus.connectionType === 'ethernet' ? 'ethernet' : 'wifi',
          signalStrength:
            networkStatus.connectionType === 'ethernet'
              ? 'strong'
              : networkStatus.signalStrength,
        },
        isActive: true,
      },
      {
        id: 'lab',
        ssid: 'Kali Lab',
        status: networkStatus.isOnline ? 'Saved network' : 'Available when online',
        iconStatus: {
          isOnline: true,
          connectionType: 'wifi',
          signalStrength: 'medium',
        },
      },
      {
        id: 'guest',
        ssid: 'Guest Portal',
        status: 'Captive portal',
        iconStatus: {
          isOnline: true,
          connectionType: 'wifi',
          signalStrength: 'weak',
        },
      },
      {
        id: 'field',
        ssid: 'Field Kit',
        status: networkStatus.isOnline ? 'Out of range' : 'Unavailable offline',
        iconStatus: {
          isOnline: false,
          connectionType: 'wifi',
          signalStrength: 'none',
        },
      },
    ];
  }, [networkStatus, allowNetwork]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          checked={allowNetwork}
          onChange={() => setAllowNetwork(!allowNetwork)}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="mt-3 border-t border-ub-grey border-opacity-40 pt-3 text-left text-sm">
        <div className="flex items-center justify-between px-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ubt-grey">Networks</p>
            <p className="text-sm text-ubt-cream">{connectionSummary}</p>
          </div>
          <NetworkStatusIcon
            allowNetwork={allowNetwork}
            status={networkStatus}
            size="small"
            showOfflineBadge={false}
          />
        </div>
        <ul className="mt-3 space-y-2 px-3">
          {demoNetworks.map((network) => (
            <li
              key={network.id}
              className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition ${
                network.isActive
                  ? 'bg-white bg-opacity-10'
                  : 'hover:bg-white hover:bg-opacity-5'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{network.ssid}</p>
                <p className="text-xs text-ubt-grey">{network.status}</p>
              </div>
              <NetworkStatusIcon
                allowNetwork={network.isActive ? allowNetwork : true}
                status={network.iconStatus}
                size="small"
                showOfflineBadge={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QuickSettings;
