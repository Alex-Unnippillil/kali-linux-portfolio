import React, { useState } from 'react';
import Image from 'next/image';
import { useSettings } from '../../hooks/useSettings';

const WIFI_CONNECTED = '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg';
const WIFI_DISCONNECTED = '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg';
const ETH_CONNECTED = '/themes/Yaru/status/network-wired-symbolic.svg';
const ETH_DISCONNECTED = '/themes/Yaru/status/network-wired-disconnected-symbolic.svg';

const SSIDS = ['kali-linux', 'hackerspace', 'airport'];

export default function Network() {
  const { allowNetwork } = useSettings();
  const [type, setType] = useState('wifi');
  const [connected, setConnected] = useState(false);
  const [ssid, setSsid] = useState('');
  const [open, setOpen] = useState(false);

  const iconSrc = type === 'ethernet'
    ? (connected ? ETH_CONNECTED : ETH_DISCONNECTED)
    : (connected ? WIFI_CONNECTED : WIFI_DISCONNECTED);

  const tooltip = connected
    ? (type === 'ethernet' ? 'Ethernet connected' : `Connected to ${ssid}`)
    : 'Disconnected';

  const connectWifi = (name) => {
    setType('wifi');
    setConnected(true);
    setSsid(name);
    setOpen(false);
  };

  const useEthernet = () => {
    setType('ethernet');
    setConnected(true);
    setSsid('');
    setOpen(false);
  };

  const disconnect = () => {
    setConnected(false);
    setSsid('');
    setOpen(false);
  };

  return (
    <div className="mx-1.5 relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={tooltip}
        className="relative"
      >
        <Image
          width={16}
          height={16}
          src={iconSrc}
          alt="network status"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-ub-cool-grey rounded-md shadow border border-black border-opacity-20 z-50">
          <ul className="py-1 text-left">
            <li>
              <button onClick={useEthernet} className="w-full px-4 py-1 hover:bg-ub-warm-grey hover:bg-opacity-20">
                Use Ethernet
              </button>
            </li>
            <li className="border-t border-ubt-grey my-1" />
            {SSIDS.map((name) => (
              <li key={name}>
                <button
                  onClick={() => connectWifi(name)}
                  className="w-full px-4 py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
                >
                  {name}
                </button>
              </li>
            ))}
            <li className="border-t border-ubt-grey my-1" />
            <li>
              <button onClick={disconnect} className="w-full px-4 py-1 hover:bg-ub-warm-grey hover:bg-opacity-20">
                Disconnect
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
