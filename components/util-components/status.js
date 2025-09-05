import React, { useEffect, useState } from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";
const MAX_VISIBLE = 3;

function TrayIcon({ src, alt, title }) {
  return (
    <span
      className="mx-0.5 flex items-center justify-center"
      style={{ width: 'var(--hit-area)', height: 'var(--hit-area)' }}
      title={title}
    >
      <Image
        width={16}
        height={16}
        src={src}
        alt={alt}
        className="max-w-full max-h-full"
        sizes="16px"
      />
    </span>
  );
}

function OverflowMenu({ icons }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mx-0.5 flex items-center justify-center"
        style={{ width: 'var(--hit-area)', height: 'var(--hit-area)' }}
        title="More indicators"
      >
        &#8230;
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 p-1 bg-ub-cool-grey border border-black border-opacity-20 rounded shadow flex"
        >
          {icons.map((icon, i) => (
            <TrayIcon key={i} {...icon} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Status({ icons = [] }) {
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

  const baseIcons = [
    {
      src: online
        ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
        : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg",
      alt: online ? "online" : "offline",
      title: online
        ? (allowNetwork ? 'Online' : 'Online (requests blocked)')
        : 'Offline',
    },
    { src: VOLUME_ICON, alt: 'volume', title: 'Volume' },
    {
      src: "/themes/Yaru/status/battery-good-symbolic.svg",
      alt: 'battery',
      title: 'Battery level',
    },
  ];

  const allIcons = [...baseIcons, ...icons];
  const visible = allIcons.slice(0, MAX_VISIBLE);
  const overflow = allIcons.slice(MAX_VISIBLE);

  return (
    <div className="flex justify-center items-center">
      {visible.map((icon, i) => (
        <TrayIcon key={i} {...icon} />
      ))}
      {overflow.length > 0 && <OverflowMenu icons={overflow} />}
      <span
        className="mx-0.5 flex items-center justify-center"
        style={{ width: 'var(--hit-area)', height: 'var(--hit-area)' }}
      >
        <SmallArrow angle="down" className="status-symbol" />
      </span>
    </div>
  );
}
