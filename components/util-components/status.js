import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import { useNetworkProfile } from '../../hooks/useNetworkProfile';

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const { profile, statusToast, clearStatusToast } = useNetworkProfile();
  const { proxyEnabled, proxyUrl, vpnConnected, vpnLabel } = profile;
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const pingServer = async () => {
      if (!window?.location) return;
      try {
        const url = new URL('/favicon.ico', window.location.href).toString();
        await fetch(url, { method: 'HEAD', cache: 'no-store' });
        setOnline(true);
      } catch (e) {
        setOnline(false);
      }
    };

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        pingServer();
      }
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!statusToast) return undefined;
    const timeout = window.setTimeout(() => {
      clearStatusToast();
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [statusToast, clearStatusToast]);

  const networkTitle = (() => {
    if (!online) return 'Offline';
    const base = allowNetwork ? 'Online' : 'Online (requests blocked)';
    const proxyStatus = proxyEnabled
      ? ` • Proxy: ${proxyUrl ? proxyUrl : 'enabled'}`
      : ' • Proxy: disabled';
    const vpnStatus = vpnConnected
      ? ` • VPN: ${vpnLabel ? vpnLabel : 'connected'}`
      : ' • VPN: disconnected';
    return `${base}${proxyStatus}${vpnStatus}`;
  })();

  return (
    <div className="relative flex justify-center items-center">
      {statusToast && (
        <div
          className="absolute top-full right-0 mt-2 px-2 py-1 text-xs bg-black/80 text-white rounded shadow-lg"
          role="status"
        >
          {statusToast}
        </div>
      )}
      <span
        className="mx-1.5 relative"
        title={networkTitle}
      >
        <Image
          width={16}
          height={16}
          src={online ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg"}
          alt={online ? "online" : "offline"}
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
        {proxyEnabled && (
          <span
            className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-black rounded-full"
            aria-hidden="true"
          />
        )}
      </span>
      <span
        className={`mx-1.5 px-1 py-0.5 rounded text-[0.6rem] font-semibold ${
          vpnConnected ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'
        }`}
        title={vpnConnected ? `VPN connected${vpnLabel ? ` (${vpnLabel})` : ''}` : 'VPN disconnected'}
      >
        VPN
      </span>
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src={VOLUME_ICON}
          alt="volume"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/battery-good-symbolic.svg"
          alt="ubuntu battry"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
