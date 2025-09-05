"use client";
import { useState } from 'react';
import ToggleSwitch from '../ToggleSwitch';

type NetworkStatus = 'connected' | 'connecting' | 'offline';

const DEFAULT_SSIDS = ['Home Wi-Fi', 'Coffee Shop', 'Airport Free Wi-Fi'];

function useNetworkModel() {
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [wiredEnabled, setWiredEnabled] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>('offline');
  const [ssid, setSsid] = useState<string | null>(null);

  const connect = (name: string) => {
    if (!wifiEnabled) return;
    setSsid(name);
    setStatus('connecting');
    setTimeout(() => {
      if (wifiEnabled) setStatus('connected');
    }, 1000);
  };

  const toggleWifi = (enabled: boolean) => {
    setWifiEnabled(enabled);
    if (!enabled) {
      setSsid(null);
      if (!wiredEnabled) setStatus('offline');
    } else if (ssid) {
      setStatus('connecting');
      setTimeout(() => setStatus('connected'), 1000);
    }
  };

  const toggleWired = (enabled: boolean) => {
    setWiredEnabled(enabled);
    if (enabled) {
      setSsid(null);
      setStatus('connected');
    } else if (!wifiEnabled || !ssid) {
      setStatus('offline');
    }
  };

  return {
    wifiEnabled,
    wiredEnabled,
    status,
    ssid,
    ssids: DEFAULT_SSIDS,
    connect,
    toggleWifi,
    toggleWired,
  };
}

const Network = () => {
  const { wifiEnabled, wiredEnabled, status, ssid, ssids, connect, toggleWifi, toggleWired } =
    useNetworkModel();

  let connectionText: string;
  if (status === 'connected') {
    connectionText = ssid ? `Connected to ${ssid}` : 'Connected';
  } else if (status === 'connecting') {
    connectionText = ssid ? `Connecting to ${ssid}…` : 'Connecting…';
  } else {
    connectionText = 'Offline';
  }

  return (
    <div className="p-4 text-sm w-64">
      <div className="mb-3 font-medium">{connectionText}</div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span>Wired</span>
          <ToggleSwitch
            ariaLabel="Toggle wired connection"
            checked={wiredEnabled}
            onChange={toggleWired}
          />
        </div>
        <div className="flex items-center justify-between">
          <span>Wi-Fi</span>
          <ToggleSwitch
            ariaLabel="Toggle Wi-Fi"
            checked={wifiEnabled}
            onChange={toggleWifi}
          />
        </div>
      </div>
      {wifiEnabled && (
        <ul className="mb-4 border-t border-ubt-cool-grey pt-2">
          {ssids.map((name) => (
            <li key={name}>
              <button
                onClick={() => connect(name)}
                className="w-full py-1 text-left flex justify-between hover:bg-ubt-cool-grey/30"
              >
                <span>{name}</span>
                {status === 'connected' && ssid === name && <span>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <a href="#" className="block text-ubt-blue hover:underline">
        Edit Connections…
      </a>
    </div>
  );
};

export default Network;

