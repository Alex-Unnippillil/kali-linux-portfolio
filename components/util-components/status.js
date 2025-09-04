import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import { useTray } from '../../hooks/useTray';

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const { icons, register, unregister } = useTray();
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

  useEffect(() => {
    const id = 'network';
    register({
      id,
      tooltip: online ? (allowNetwork ? 'Online' : 'Online (requests blocked)') : 'Offline',
      sni: online
        ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
        : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg",
      legacy: online
        ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
        : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg",
    });
    return () => unregister(id);
  }, [online, allowNetwork, register, unregister]);

  useEffect(() => {
    const id = 'volume';
    register({ id, tooltip: 'Volume', sni: VOLUME_ICON, legacy: VOLUME_ICON });
    return () => unregister(id);
  }, [register, unregister]);

  useEffect(() => {
    const id = 'battery';
    register({
      id,
      tooltip: 'Battery',
      sni: '/themes/Yaru/status/battery-good-symbolic.svg',
      legacy: '/themes/Yaru/status/battery-good-symbolic.svg',
    });
    return () => unregister(id);
  }, [register, unregister]);

  return (
    <div className="flex justify-center items-center" role="group" aria-label="System tray">
      {icons.map((icon) => (
        <span key={icon.id} className="mx-1.5 relative" title={icon.tooltip}>
          <Image
            width={16}
            height={16}
            src={icon.sni || icon.legacy}
            alt={icon.tooltip || icon.id}
            className="inline status-symbol w-4 h-4"
            sizes="16px"
          />
          {icon.id === 'network' && !allowNetwork && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </span>
      ))}
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
