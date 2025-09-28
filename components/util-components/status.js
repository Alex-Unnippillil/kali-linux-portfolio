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
    <div className="flex justify-center items-center">
      <span
        className="mx-1.5 relative"
        title={
          online
            ? allowNetwork
              ? 'Kali network: Online'
              : 'Kali network: Online (requests blocked)'
            : 'Kali network: Offline'
        }
      >
        <Image
          width={16}
          height={16}
          src={
            online
              ? '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg'
              : '/themes/Kali/panel/network-wireless-signal-none-symbolic.svg'
          }
          alt={online ? 'Kali network online' : 'Kali network offline'}
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-kali-accent rounded-full" />
        )}
      </span>
      <VolumeControl className="mx-1.5" />
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Kali/panel/battery-good-symbolic.svg"
          alt="Kali battery"
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
