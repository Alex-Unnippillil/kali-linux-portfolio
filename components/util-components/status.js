import React, { useEffect, useState } from "react";
import Image from "next/image";
import SmallArrow from "./small_arrow";
import { useSettings } from "../../hooks/useSettings";
import useGameAudio from "../../hooks/useGameAudio";

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const { muted, setMuted, volume, setVolume } = useGameAudio();
  const [online, setOnline] = useState(true);
  const [showSlider, setShowSlider] = useState(false);

  const sliderValue = muted ? 0 : volume;

  const handleMiddleClick = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setMuted(!muted);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, sliderValue + delta));
    setVolume(newVol);
    setMuted(newVol === 0);
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
  };

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
      <span
        className="mx-1.5 relative"
        onMouseDown={handleMiddleClick}
        onWheel={handleWheel}
        onMouseEnter={() => setShowSlider(true)}
        onMouseLeave={() => setShowSlider(false)}
      >
        <Image
          width={16}
          height={16}
          src={VOLUME_ICON}
          alt="volume"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {showSlider && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ub-cool-grey p-2 rounded shadow-md">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-24"
            />
          </div>
        )}
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
