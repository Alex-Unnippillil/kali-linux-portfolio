"use client";

import { useSettings } from "../../hooks/useSettings";
import BackgroundSlideshow from "../../apps/settings/components/BackgroundSlideshow";

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

export default function Wallpaper() {
  const {
    wallpaper,
    wallpapers,
    setWallpaper,
    useSameWallpaper,
    setUseSameWallpaper,
  } = useSettings();

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    setWallpaper(WALLPAPERS[idx]);
  };

  const currentIndex = WALLPAPERS.indexOf(wallpaper);

  return (
    <>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={useSameWallpaper}
            onChange={(e) => setUseSameWallpaper(e.target.checked)}
          />
          Use same wallpaper for all workspaces
        </label>
      </div>
      {useSameWallpaper ? (
        <>
          <div className="flex justify-center my-4">
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">
              Wallpaper:
            </label>
            <input
              id="wallpaper-slider"
              type="range"
              min="0"
              max={WALLPAPERS.length - 1}
              step="1"
              value={currentIndex}
              onChange={handleSlider}
              className="ubuntu-slider"
              aria-label="Wallpaper"
            />
          </div>
          <div className="flex justify-center my-4">
            <BackgroundSlideshow />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900">
            {WALLPAPERS.map((name) => (
              <div
                key={name}
                role="button"
                aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
                aria-pressed={name === wallpaper}
                tabIndex={0}
                onClick={() => setWallpaper(name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setWallpaper(name);
                  }
                }}
                className={
                  (name === wallpaper
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
        </>
      ) : (
        <>
          {wallpapers.map((wp, idx) => (
            <div key={idx} className="mt-4 border-t border-gray-900 pt-4">
              <p className="text-center text-ubt-grey mb-2">Workspace {idx + 1}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                {WALLPAPERS.map((name) => (
                  <div
                    key={name + idx}
                    role="button"
                    aria-label={`Select ${name.replace(
                      "wall-",
                      "wallpaper "
                    )} for workspace ${idx + 1}`}
                    aria-pressed={name === wp}
                    tabIndex={0}
                    onClick={() => setWallpaper(name, idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setWallpaper(name, idx);
                      }
                    }}
                    className={
                      (name === wp
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
            </div>
          ))}
        </>
      )}
    </>
  );
}
