import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";
const BATTERY_ICON = "/themes/Yaru/status/battery-good-symbolic.svg";
const BATTERY_UNSUPPORTED_ICON = "/themes/Yaru/status/plug-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);
  const [batteryStatus, setBatteryStatus] = useState({
    supported: null,
    level: null,
    charging: false,
  });

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
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') {
      setBatteryStatus({ supported: false, level: null, charging: false });
      return undefined;
    }

    let isMounted = true;
    let batteryManager;

    const updateBatteryStatus = () => {
      if (!isMounted || !batteryManager) return;
      setBatteryStatus({
        supported: true,
        level: batteryManager.level,
        charging: batteryManager.charging,
      });
    };

    navigator
      .getBattery()
      .then((battery) => {
        if (!isMounted) {
          return;
        }
        batteryManager = battery;
        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setBatteryStatus({ supported: false, level: null, charging: false });
      });

    return () => {
      isMounted = false;
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBatteryStatus);
        batteryManager.removeEventListener('chargingchange', updateBatteryStatus);
      }
    };
  }, []);

  const batterySupported = batteryStatus.supported;
  const batteryLevel = batteryStatus.level;
  const batteryPercentage =
    typeof batteryLevel === 'number' ? Math.round(batteryLevel * 100) : null;
  const batteryTitle = batterySupported && batteryPercentage !== null
    ? `${batteryStatus.charging ? 'Charging' : 'Battery'} ${batteryPercentage}%`
    : 'Battery status unavailable';

  return (
    <div className="flex justify-center items-center">
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
      <span
        className="mx-1.5 inline-flex items-center"
        title={batteryTitle}
      >
        <Image
          width={16}
          height={16}
          src={batterySupported ? BATTERY_ICON : BATTERY_UNSUPPORTED_ICON}
          alt={batterySupported ? 'battery status' : 'battery status unavailable'}
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {batterySupported && batteryPercentage !== null && (
          <span className="ml-1 text-xs font-semibold leading-4">
            {batteryPercentage}%
          </span>
        )}
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
