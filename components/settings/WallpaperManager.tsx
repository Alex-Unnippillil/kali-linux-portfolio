"use client";

import { useEffect, useState } from "react";
import { defaults } from "../../utils/settingsStore";

interface Props {
  wallpapers: string[];
  selected: string;
  onSelect: (wallpaper: string) => void;
}

/**
 * Allows users to drag and drop a custom wallpaper image. The image is stored
 * in localStorage as a data URL and surfaced alongside the default wallpaper
 * choices. Users can remove the custom wallpaper which also clears stored
 * data.
 */
export default function WallpaperManager({
  wallpapers,
  selected,
  onSelect,
}: Props) {
  const STORAGE_KEY = "custom-wallpaper";
  const [custom, setCustom] = useState<string | null>(null);

  // Load custom wallpaper from storage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setCustom(stored);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      window.localStorage.setItem(STORAGE_KEY, dataUrl);
      setCustom(dataUrl);
      onSelect(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.localStorage.removeItem(STORAGE_KEY);
    if (custom && selected === custom) {
      onSelect(defaults.wallpaper);
    }
    setCustom(null);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900"
    >
      {custom && (
        <div
          key="custom"
          role="button"
          aria-label="Select custom wallpaper"
          aria-pressed={selected === custom}
          tabIndex={0}
          onClick={() => onSelect(custom)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(custom);
            }
          }}
          className={
            (selected === custom
              ? " border-yellow-700 "
              : " border-transparent ") +
            " relative md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"
          }
          style={{
            backgroundImage: `url(${custom})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
          }}
        >
          <button
            onClick={handleClear}
            aria-label="Remove custom wallpaper"
            className="absolute top-1 right-1 bg-black/50 text-white rounded px-1"
          >
            ×
          </button>
        </div>
      )}
      {wallpapers.map((name) => (
        <div
          key={name}
          role="button"
          aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
          aria-pressed={name === selected}
          tabIndex={0}
          onClick={() => onSelect(name)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(name);
            }
          }}
          className={
            (name === selected
              ? " border-yellow-700 "
              : " border-transparent ") +
            " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"
          }
          style={{
            backgroundImage: `url(/wallpapers/${name}.webp)`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
          }}
        ></div>
      ))}
    </div>
  );
}

