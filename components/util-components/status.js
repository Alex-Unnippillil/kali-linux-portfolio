import React, { useEffect, useState } from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';

export default function Status({ className = "" }) {
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
    "status-cluster flex items-center gap-2 text-[0.75rem] font-medium text-white/70",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const controlClasses =
    "status-control rounded-full border border-white/10 bg-slate-900/60 px-1.5 py-1 shadow-[0_12px_28px_-24px_rgba(2,6,23,0.95)] backdrop-blur-sm transition hover:border-white/25 hover:bg-slate-800/80";

  const statusPillClasses = [
    "hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.32em] sm:flex",
    online
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : "border-rose-400/40 bg-rose-500/10 text-rose-200",
  ].join(" ");

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <NetworkIndicator
        className={controlClasses}
        allowNetwork={allowNetwork}
        online={online}
      />
      <VolumeControl className={controlClasses} />
      <BatteryIndicator className={controlClasses} />
      <span className={statusPillClasses}>
        <span
          className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400"}`}
          aria-hidden="true"
        />
        {online ? "Online" : "Offline"}
      </span>
      <span
        className="status-chevron inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 shadow-[0_6px_18px_-16px_rgba(15,23,42,0.9)]"
        aria-hidden="true"
      >
        <SmallArrow angle="down" />
      </span>
    </div>
  );
}
