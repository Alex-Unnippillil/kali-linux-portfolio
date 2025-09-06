import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";
const SENSORS_PREFIX = "xfce.panel.sensors.";

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);
  const [temperature, setTemperature] = useState(42);
  const [unit, setUnit] = useState(() => {
    if (typeof window === "undefined") return "c";
    return localStorage.getItem(`${SENSORS_PREFIX}unit`) === "f" ? "f" : "c";
  });
  const [layout, setLayout] = useState(() => {
    if (typeof window === "undefined") return "both";
    return localStorage.getItem(`${SENSORS_PREFIX}layout`) || "both";
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
    const id = setInterval(() => {
      setTemperature((t) => {
        const next = t + (Math.random() * 2 - 1) * 5;
        return Math.max(30, Math.min(90, next));
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { unit: u, layout: l } = e.detail || {};
      if (u) setUnit(u);
      if (l) setLayout(l);
    };
    window.addEventListener("sensors:settingsChanged", handler);
    return () => window.removeEventListener("sensors:settingsChanged", handler);
  }, []);

  const renderTemp = () => {
    const tempC = temperature;
    const temp = unit === "f" ? (tempC * 9) / 5 + 32 : tempC;
    const symbol = unit === "f" ? "°F" : "°C";
    return (
      <span className="mx-1.5 flex items-center">
        {layout !== "bars" && (
          <span className="text-xs">
            {Math.round(temp)}
            {symbol}
          </span>
        )}
        {layout !== "text" && (
          <span className="ml-1 w-8 h-2 bg-ub-dark-grey rounded overflow-hidden">
            <span
              className="block h-full bg-ub-orange"
              style={{ width: `${Math.min(100, tempC)}%` }}
            />
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="flex justify-center items-center">
      {renderTemp()}
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
        />
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
