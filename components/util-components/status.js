"use client";

import React, { useEffect, useState } from "react";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';

export default function Status({ className = "", activeDropdown, onDropdownToggle }) {
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

  const containerClasses = [
    "status-cluster flex items-center gap-0.5 text-[0.75rem] font-medium text-white/80",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Modern pill-style button for each control
  const controlClasses =
    "flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] transition-all duration-150 backdrop-blur-sm border border-white/[0.06] hover:border-white/[0.12]";

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <NetworkIndicator
        className={controlClasses}
        allowNetwork={allowNetwork}
        online={online}
        isOpen={activeDropdown === 'network'}
        onToggle={() => onDropdownToggle && onDropdownToggle('network')}
      />
      <VolumeControl
        className={controlClasses}
        isOpen={activeDropdown === 'volume'}
        onToggle={() => onDropdownToggle && onDropdownToggle('volume')}
      />
      <BatteryIndicator
        className={controlClasses}
        isOpen={activeDropdown === 'battery'}
        onToggle={() => onDropdownToggle && onDropdownToggle('battery')}
      />
    </div>
  );
}
