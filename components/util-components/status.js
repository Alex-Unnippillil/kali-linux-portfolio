import React, { useEffect, useState } from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';

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
    <div className="status-cluster">
      <NetworkIndicator allowNetwork={allowNetwork} online={online} />
      <VolumeControl />
      <BatteryIndicator />
      <span className="status-chevron" aria-hidden="true">
        <SmallArrow angle="down" />
      </span>
    </div>
  );
}
