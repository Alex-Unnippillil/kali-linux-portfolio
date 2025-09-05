"use client";

import React from "react";
import { useSettings } from "../../hooks/useSettings";
import { OFFICIAL_WALLPAPERS, getWallpaperUrl } from "../../utils/wallpapers";

export default function Appearance() {
  const { wallpaper, setWallpaper } = useSettings();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {OFFICIAL_WALLPAPERS.map((id) => {
        const src = getWallpaperUrl(id);
        const selected = wallpaper === id;
        return (
          <button
            key={id}
            onClick={() => setWallpaper(id)}
            className={`relative overflow-hidden rounded focus:outline-none border-4 ${
              selected ? "border-yellow-700" : "border-transparent"
            }`}
          >
            <img src={src} alt={`Kali Linux ${id}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
              {id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
