import React, { useEffect, useState } from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import {
  NetworkSignalGoodIcon,
  NetworkSignalNoneIcon,
  VolumeMediumIcon,
  BatteryGoodIcon,
} from '../shell/shell-icons';

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
        title={online ? (allowNetwork ? 'Online' : 'Online (requests blocked)') : 'Offline'}
      >
        {online ? (
          <NetworkSignalGoodIcon className="inline status-symbol w-4 h-4" aria-hidden="true" />
        ) : (
          <NetworkSignalNoneIcon className="inline status-symbol w-4 h-4" aria-hidden="true" />
        )}
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </span>
      <span className="mx-1.5">
        <VolumeMediumIcon className="inline status-symbol w-4 h-4" aria-hidden="true" />
      </span>
      <span className="mx-1.5">
        <BatteryGoodIcon className="inline status-symbol w-4 h-4" aria-hidden="true" />
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
