"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSettings } from "../../hooks/useSettings";

interface WallpaperInfo {
  id: string;
  thumbnail: string;
}

export default function WallpaperManager() {
  const { wallpaper, setWallpaper } = useSettings();
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/wallpapers/manifest.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWallpapers(data);
        else if (Array.isArray(data.wallpapers)) setWallpapers(data.wallpapers);
      })
      .catch(() => setWallpapers([]));
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const prefix = "wallpaper-preview-";
    const existing = Array.from(el.classList).filter((c) => c.startsWith(prefix));
    existing.forEach((c) => el.classList.remove(c));
    if (preview) el.classList.add(prefix + preview);
    return () => {
      const toRemove = Array.from(el.classList).filter((c) => c.startsWith(prefix));
      toRemove.forEach((c) => el.classList.remove(c));
    };
  }, [preview]);

  useEffect(() => {
    if (wallpapers.length === 0) return;
    const style = document.createElement("style");
    style.id = "wallpaper-preview-styles";
    style.textContent = wallpapers
      .map(
        (w) =>
          `html.wallpaper-preview-${w.id} .bg-ubuntu-img {background-image:url(/wallpapers/${w.thumbnail}); background-size:cover; background-repeat:no-repeat;}
html.wallpaper-preview-${w.id} .bg-ubuntu-img img{opacity:0;}`
      )
      .join("\n");
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [wallpapers]);

  const apply = () => {
    if (preview) {
      setWallpaper(preview);
      setPreview(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
        {wallpapers.map((w) => (
          <button
            key={w.id}
            onClick={() => setPreview(w.id)}
            className={`outline-none border-4 ${
              preview === w.id || (!preview && wallpaper === w.id)
                ? "border-yellow-700"
                : "border-transparent"
            }`}
          >
            <Image
              src={`/wallpapers/${w.thumbnail}`}
              alt={w.id}
              width={112}
              height={70}
              className="object-cover w-28 h-20"
            />
          </button>
        ))}
      </div>
      {preview && (
        <div className="flex justify-center gap-4">
          <button
            onClick={apply}
            className="px-4 py-2 rounded bg-ub-orange text-white"
          >
            Apply
          </button>
          <button
            onClick={() => setPreview(null)}
            className="px-4 py-2 rounded bg-ub-cool-grey border border-ubt-cool-grey"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

