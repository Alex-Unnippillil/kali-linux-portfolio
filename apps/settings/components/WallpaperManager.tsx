'use client';

import { useEffect } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { useSettings } from '../../../hooks/useSettings';

const wallpapers = [
  'wall-1',
  'wall-2',
  'wall-3',
  'wall-4',
  'wall-5',
  'wall-6',
  'wall-7',
  'wall-8',
];

export default function WallpaperManager() {
  const {
    wallpaper,
    lockWallpaper,
    setLockWallpaper,
    lockSameAsDesktop,
    setLockSameAsDesktop,
    lockBlur,
    setLockBlur,
  } = useSettings();

  useEffect(() => {
    if (lockSameAsDesktop) {
      setLockWallpaper(wallpaper);
    }
  }, [lockSameAsDesktop, wallpaper, setLockWallpaper]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center my-4 items-center">
        <label className="mr-2 text-ubt-grey">Lock same as desktop</label>
        <ToggleSwitch
          ariaLabel="Lock wallpaper same as desktop"
          checked={lockSameAsDesktop}
          onChange={setLockSameAsDesktop}
        />
      </div>
      {!lockSameAsDesktop && (
        <div className="flex justify-center my-4">
          <label htmlFor="lock-wallpaper-slider" className="mr-2 text-ubt-grey">
            Lock Wallpaper:
          </label>
          <input
            id="lock-wallpaper-slider"
            type="range"
            min="0"
            max={wallpapers.length - 1}
            step="1"
            value={wallpapers.indexOf(lockWallpaper)}
            onChange={(e) =>
              setLockWallpaper(wallpapers[parseInt(e.target.value, 10)])
            }
            className="ubuntu-slider"
            aria-label="Lock screen wallpaper"
          />
        </div>
      )}
      <div className="flex justify-center my-4">
        <label htmlFor="lock-blur" className="mr-2 text-ubt-grey">
          Blur intensity:
        </label>
        <input
          id="lock-blur"
          type="range"
          min="0"
          max="20"
          value={lockBlur}
          onChange={(e) => setLockBlur(parseInt(e.target.value, 10))}
          className="ubuntu-slider"
        />
      </div>
    </div>
  );
}
