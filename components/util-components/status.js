import React, { useEffect, useState } from "react";
import Image from "next/image";
import SmallArrow from "./small_arrow";
import { useSettings } from "../../hooks/useSettings";

const VOLUME_ICON = "/themes/Yaru/status/audio-volume-medium-symbolic.svg";

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);
  const [ssid, setSsid] = useState("");
  const [volume, setVolume] = useState(100);
  const [battery, setBattery] = useState({ level: 1, charging: false });

  useEffect(() => {
    const pingServer = async () => {
      if (!window?.location) return;
      try {
        const url = new URL("/favicon.ico", window.location.href).toString();
        await fetch(url, { method: "HEAD", cache: "no-store" });
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
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const updateConnection = () => {
      if (!connection) return;
      const name = connection.ssid || connection.effectiveType || "";
      setSsid(name);
    };
    updateConnection();
    connection?.addEventListener("change", updateConnection);
    return () => connection?.removeEventListener("change", updateConnection);
  }, []);

  useEffect(() => {
    const mediaElements = Array.from(document.querySelectorAll("audio,video"));
    const updateVolume = () => {
      const el = mediaElements[0];
      if (el) setVolume(Math.round(el.volume * 100));
    };
    updateVolume();
    mediaElements.forEach((el) => el.addEventListener("volumechange", updateVolume));
    return () => {
      mediaElements.forEach((el) => el.removeEventListener("volumechange", updateVolume));
    };
  }, []);

  useEffect(() => {
    let batteryRef;
    const updateBattery = () => {
      if (!batteryRef) return;
      setBattery({ level: batteryRef.level, charging: batteryRef.charging });
    };
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        batteryRef = b;
        updateBattery();
        b.addEventListener("levelchange", updateBattery);
        b.addEventListener("chargingchange", updateBattery);
      });
    }
    return () => {
      if (batteryRef) {
        batteryRef.removeEventListener("levelchange", updateBattery);
        batteryRef.removeEventListener("chargingchange", updateBattery);
      }
    };
  }, []);

  const networkTitle = online
    ? allowNetwork
      ? ssid
        ? `SSID: ${ssid}`
        : "Online"
      : "Online (requests blocked)"
    : "Offline";

  const volumeTitle = `Volume: ${volume}%`;
  const batteryTitle = `Battery: ${Math.round(battery.level * 100)}%${
    battery.charging ? " (charging)" : ""
  }`;

  return (
    <div className="flex justify-center items-center">
      <span className="mx-1.5 relative" title={networkTitle}>
        <Image
          width={16}
          height={16}
          src={
            online
              ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
              : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg"
          }
          alt={online ? "online" : "offline"}
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
        {!allowNetwork && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </span>
      <span className="mx-1.5" title={volumeTitle}>
        <Image
          width={16}
          height={16}
          src={VOLUME_ICON}
          alt="volume"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1.5" title={batteryTitle}>
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
