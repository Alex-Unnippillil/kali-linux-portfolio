import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import { useTray } from '../../hooks/useTray';

export default function Status() {
  const { allowNetwork, theme, symbolicTrayIcons } = useSettings();
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
    const themeDir = theme === 'kali-light' ? 'Yaru' : 'Yaru';
    const connected = `/themes/${themeDir}/status/network-wireless-signal-good-symbolic.svg`;
    const disconnected = `/themes/${themeDir}/status/network-wireless-signal-none-symbolic.svg`;
    register({
      id,
      tooltip: online ? (allowNetwork ? 'Online' : 'Online (requests blocked)') : 'Offline',
      sni: online ? connected : disconnected,
      legacy: online ? connected : disconnected,
    });
    return () => unregister(id);
  }, [online, allowNetwork, register, unregister, theme]);

  useEffect(() => {
    const id = 'volume';
    const themeDir = theme === 'kali-light' ? 'Yaru' : 'Yaru';
    const icon = `/themes/${themeDir}/status/audio-volume-medium-symbolic.svg`;
    register({ id, tooltip: 'Volume', sni: icon, legacy: icon });
    return () => unregister(id);
  }, [register, unregister, theme]);

  useEffect(() => {
    const id = 'battery';
    const themeDir = theme === 'kali-light' ? 'Yaru' : 'Yaru';
    const icon = `/themes/${themeDir}/status/battery-good-symbolic.svg`;
    register({ id, tooltip: 'Battery', sni: icon, legacy: icon });
    return () => unregister(id);
  }, [register, unregister, theme]);

  return (
    <div className="flex items-center gap-2 md:gap-1 lg:gap-2" role="group" aria-label="System tray">
      {icons.map((icon) => (
        <span
          key={icon.id}
          className="relative flex items-center justify-center w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5"
          title={icon.tooltip}
        >
          <Image
            width={20}
            height={20}
            src={
              symbolicTrayIcons
                ? icon.sni || icon.legacy
                : icon.legacy || icon.sni
            }
            alt={icon.tooltip || icon.id}
            className="status-symbol w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5"
            sizes="20px"
          />
          {icon.id === 'network' && !allowNetwork && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </span>
      ))}
      <span className="flex items-center justify-center w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5">
        <SmallArrow angle="down" className="status-symbol" />
      </span>
    </div>
  );
}
