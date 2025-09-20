import React, { useEffect, useState } from "react";
import Image from 'next/image';
import Toast from '../ui/Toast';
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';

const { subscribeStatusToast } = require('../../utils/statusToast');

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState(null);

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
    const unsubscribe = subscribeStatusToast((message) => {
      if (!message) return;
      setToast({ id: Date.now(), message });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
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
    </>
  );
}
