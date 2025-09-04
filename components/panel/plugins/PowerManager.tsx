"use client";

import { useState } from "react";
import Image from "next/image";
import ToggleSwitch from "@/components/ToggleSwitch";

export default function PowerManager() {
  const [open, setOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [presentationMode, setPresentationMode] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label="Power manager"
        onClick={() => setOpen((o) => !o)}
        className="relative focus:outline-none"
      >
        <Image
          src="/themes/Yaru/status/battery-good-symbolic.svg"
          alt="Battery status"
          width={24}
          height={24}
        />
        {presentationMode && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-ub-orange rounded-full" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-gray-800 text-white shadow-lg p-4 z-10">
          <label className="block mb-2 text-sm">
            Brightness
            <input
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full mt-1"
              aria-label="Brightness"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm">Presentation Mode</span>
            <ToggleSwitch
              checked={presentationMode}
              onChange={setPresentationMode}
              ariaLabel="Presentation Mode"
            />
          </div>
        </div>
      )}
    </div>
  );
}
