import React, { useEffect, useState } from "react";
import { BatteryFull, Wifi, WifiOff } from "lucide-react";
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

  const networkStatusLabel = online
    ? allowNetwork
      ? "Online"
      : "Online (requests blocked)"
    : "Offline";

  return (
    <div className="flex justify-center items-center">
      <span
        className="mx-1.5 relative inline-flex"
        role="img"
        aria-label={networkStatusLabel}
        title={networkStatusLabel}
      >
        {online ? (
          <Wifi
            aria-hidden="true"
            focusable="false"
            className="status-symbol h-4 w-4"
            strokeWidth={2}
          />
        ) : (
          <WifiOff
            aria-hidden="true"
            focusable="false"
            className="status-symbol h-4 w-4"
            strokeWidth={2}
          />
        )}
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
        )}
      </span>
      <VolumeControl className="mx-1.5" />
      <span
        className="mx-1.5 inline-flex"
        role="img"
        aria-label="Battery level: good"
        title="Battery level: good"
      >
        <BatteryFull
          aria-hidden="true"
          focusable="false"
          className="status-symbol h-4 w-4"
          strokeWidth={2}
        />
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
