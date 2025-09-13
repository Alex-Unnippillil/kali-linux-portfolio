"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import { useRouter } from "next/router";

interface Props {
  lockScreen?: () => void;
  shutDown?: () => void;
}

const StatusCluster = ({ lockScreen, shutDown }: Props) => {
  const router = useRouter();
  const [online, setOnline] = usePersistentState<boolean>("qs-online", true);
  const [sound, setSound] = usePersistentState<boolean>("qs-sound", true);
  const [volume, setVolume] = usePersistentState<number>("qs-volume", 100);
  const [showVolume, setShowVolume] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [showPower, setShowPower] = useState(false);

  // track real network connectivity
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const update = () => setConnected(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // battery level
  useEffect(() => {
    let batt: any;
    const handle = () => setBatteryLevel(Math.round(batt.level * 100));
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((b: any) => {
        batt = b;
        handle();
        b.addEventListener("levelchange", handle);
      });
    }
    return () => batt?.removeEventListener("levelchange", handle);
  }, []);

  const batteryIcon = () => {
    if (batteryLevel === null) return "";
    if (batteryLevel > 90) return "/themes/Flat-Remix/status/battery-full-symbolic.svg";
    if (batteryLevel > 60) return "/themes/Flat-Remix/status/battery-good-symbolic.svg";
    if (batteryLevel > 30) return "/themes/Flat-Remix/status/battery-low-symbolic.svg";
    return "/themes/Flat-Remix/status/battery-empty-symbolic.svg";
  };

  const handleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lockScreen) lockScreen();
    else router.push("/lock-screen");
  };

  const handlePower = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPower(true);
  };

  const confirmShutdown = () => {
    setShowPower(false);
    if (shutDown) shutDown();
  };

  return (
    <div className="flex items-center relative select-none">
      <button
        type="button"
        onClick={() => setOnline(!online)}
        aria-label={online && connected ? "Online" : "Offline"}
        title={online && connected ? "Online" : "Offline"}
        className="mx-1.5"
      >
        <Image
          src={
            online && connected
              ? "/themes/Flat-Remix/status/network-wireless-signal-good-symbolic.svg"
              : "/themes/Flat-Remix/status/network-wireless-offline-symbolic.svg"
          }
          width={16}
          height={16}
          alt={online && connected ? "online" : "offline"}
          className="w-4 h-4"
        />
      </button>
      <span className="mx-1.5" aria-label="Bluetooth" title="Bluetooth">
        <Image
          src="/themes/Flat-Remix/status/bluetooth-active-symbolic.svg"
          width={16}
          height={16}
          alt="bluetooth"
          className="w-4 h-4"
        />
      </span>
      <div
        className="mx-1.5 relative"
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSound(!sound || volume === 0);
            if (sound && volume === 0) setVolume(100);
            if (!sound) setVolume(0);
          }}
          aria-label={sound && volume > 0 ? `Volume ${volume}%` : "Muted"}
          title={sound && volume > 0 ? `Volume ${volume}%` : "Muted"}
        >
          <Image
            src={
              sound && volume > 0
                ? "/themes/Flat-Remix/status/audio-volume-high-symbolic.svg"
                : "/themes/Flat-Remix/status/audio-volume-muted-symbolic.svg"
            }
            width={16}
            height={16}
            alt="volume"
            className="w-4 h-4"
          />
        </button>
        {showVolume && (
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              setSound(v > 0);
            }}
            className="absolute right-0 -top-6 w-20"
          />
        )}
      </div>
      {batteryLevel !== null && (
        <span
          className="mx-1.5"
          aria-label={`Battery ${batteryLevel}%`}
          title={`${batteryLevel}%`}
        >
          <Image
            src={batteryIcon()}
            width={16}
            height={16}
            alt="battery"
            className="w-4 h-4"
          />
        </span>
      )}
      <button
        type="button"
        onClick={handleLock}
        aria-label="Lock screen"
        className="mx-1.5"
        title="Lock screen"
      >
        <Image
          src="/themes/Flat-Remix/status/system-lock-screen-symbolic.svg"
          width={16}
          height={16}
          alt="lock"
          className="w-4 h-4"
        />
      </button>
      <button
        type="button"
        onClick={handlePower}
        aria-label="Power options"
        className="mx-1.5"
        title="Power options"
      >
        <Image
          src="/themes/Flat-Remix/actions/system-shutdown-symbolic.svg"
          width={16}
          height={16}
          alt="power"
          className="w-4 h-4"
        />
      </button>
      {showPower && (
        <div className="absolute right-0 top-6 bg-ub-cool-grey border border-black border-opacity-20 rounded-md p-2 shadow">
          <p className="mb-2">Shut down?</p>
          <div className="flex justify-end space-x-2">
            <button className="px-2" onClick={() => setShowPower(false)}>
              Cancel
            </button>
            <button className="px-2" onClick={confirmShutdown}>
              Shut down
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCluster;

