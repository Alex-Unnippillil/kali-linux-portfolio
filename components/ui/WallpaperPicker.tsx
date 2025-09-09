"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

const WALLPAPERS = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
  "wall-5",
  "wall-6",
  "wall-7",
  "wall-8",
];

export default function WallpaperPicker() {
  const { wallpaper, setWallpaper } = useSettings();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--background-image",
      `url(/wallpapers/${wallpaper}.webp)`
    );
  }, [wallpaper]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
      {WALLPAPERS.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
          aria-pressed={name === wallpaper}
          onClick={() => setWallpaper(name)}
          className={`md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80 ${
            name === wallpaper ? "border-yellow-700" : "border-transparent"
          }`}
          style={{
            backgroundImage: `url(/wallpapers/${name}.webp)`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
          }}
        />
      ))}
    </div>
  );
}

