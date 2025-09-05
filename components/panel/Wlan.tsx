"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const SSIDS = [
  "Home Network",
  "CoffeeShop",
  "Airport Free",
  "Library WiFi",
];

function randomSignal() {
  return Math.floor(Math.random() * 101); // 0-100
}

function randomSsid() {
  return SSIDS[Math.floor(Math.random() * SSIDS.length)];
}

const Wlan: React.FC = () => {
  const router = useRouter();
  const [signal, setSignal] = useState(0);
  const [ssid, setSsid] = useState("");

  useEffect(() => {
    const update = () => {
      setSignal(randomSignal());
      setSsid(randomSsid());
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, []);

  const handleClick = () => {
    router.push("/network");
  };

  const bars = [25, 50, 75, 100];
  const heights = ["h-1", "h-2", "h-3", "h-4"];

  return (
    <div
      className="flex items-center cursor-pointer select-none"
      title={`${ssid} (${signal}%)`}
      onClick={handleClick}
    >
      <div className="flex items-end mr-2">
        {bars.map((threshold, idx) => (
          <span
            key={threshold}
            className={`w-1 mx-[1px] bg-current transition-opacity ${heights[idx]} ${
              signal >= threshold ? "opacity-100" : "opacity-20"
            }`}
          />
        ))}
      </div>
      <span>{ssid}</span>
    </div>
  );
};

export default Wlan;

