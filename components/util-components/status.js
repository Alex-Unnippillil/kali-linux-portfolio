import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';

export default function Status() {
  const { allowNetwork } = useSettings();
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

  return (
    <div className="flex items-center gap-2 text-kali-accent-text-strong">
      <span
        className="relative flex items-center"
        title={online ? (allowNetwork ? 'Online' : 'Online (requests blocked)') : 'Offline'}
      >
        <Image
          width={16}
          height={16}
          src={
            online
              ? "/themes/Kali/panel/network-wireless-signal-good-symbolic.svg"
              : "/themes/Kali/panel/network-wireless-signal-none-symbolic.svg"
          }
          alt={online ? "online" : "offline"}
          className="status-symbol h-4 w-4"
          sizes="16px"
        />
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </span>
      <VolumeControl className="text-kali-accent-text-strong" />
      <span className="flex items-center">
        <Image
          width={16}
          height={16}
          src="/themes/Kali/panel/battery-good-symbolic.svg"
          alt="battery status"
          className="status-symbol h-4 w-4"
          sizes="16px"
        />
      </span>
      <span className="flex items-center">
        <SmallArrow angle="down" className="status-symbol text-kali-accent-text-muted" />
      </span>
    </div>
  );
}
