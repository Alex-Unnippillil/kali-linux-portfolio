import React, { useEffect, useState, useCallback } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import BrightnessOverlay from "../osd/BrightnessOverlay";

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);

  // Local brightness state (0-100)
  const [brightness, setBrightness] = useState(100);
  const [showMenu, setShowMenu] = useState(false);
  const [showOsd, setShowOsd] = useState(false);

  const changeBrightness = useCallback((val) => {
    setBrightness((prev) => {
      const next = Math.max(0, Math.min(100, typeof val === 'function' ? val(prev) : val));
      return next;
    });
    setShowOsd(true);
  }, []);

  useEffect(() => {
    if (!showOsd) return;
    const id = setTimeout(() => setShowOsd(false), 1000);
    return () => clearTimeout(id);
  }, [showOsd]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'XF86MonBrightnessUp') {
        e.preventDefault();
        changeBrightness((b) => Math.min(100, b + 10));
      } else if (e.key === 'XF86MonBrightnessDown') {
        e.preventDefault();
        changeBrightness((b) => Math.max(0, b - 10));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeBrightness]);

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
    <div className="flex justify-center items-center relative">
      <span
        className="mx-1.5 relative"
        title={online ? (allowNetwork ? 'Online' : 'Online (requests blocked)') : 'Offline'}
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
          title={`${brightness}%`}
        />
      </span>
      <span className="mx-1" onClick={() => setShowMenu((o) => !o)}>
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded p-3 space-y-2 z-40">
          <div>
            <label className="text-xs">Brightness: {brightness}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => changeBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
      {showOsd && <BrightnessOverlay value={brightness} />}
    </div>
  );
}
