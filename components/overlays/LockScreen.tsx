'use client';

import { useEffect } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  isLocked: boolean;
  unLockScreen: () => void;
}

export default function LockScreen({ isLocked, unLockScreen }: Props) {
  const { wallpaper, lockWallpaper, lockSameAsDesktop, lockBlur } = useSettings();

  useEffect(() => {
    if (!isLocked) return;
    window.addEventListener('click', unLockScreen);
    window.addEventListener('keypress', unLockScreen);
    return () => {
      window.removeEventListener('click', unLockScreen);
      window.removeEventListener('keypress', unLockScreen);
    };
  }, [isLocked, unLockScreen]);

  const bg = lockSameAsDesktop ? wallpaper : lockWallpaper;

  return (
    <div
      id="ubuntu-lock-screen"
      style={{ zIndex: '100', contentVisibility: 'auto' }}
      className={(isLocked ? ' visible translate-y-0 ' : ' invisible -translate-y-full ') + ' absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen'}
    >
      <img
        src={`/wallpapers/${bg}.webp`}
        alt=""
        className="absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500"
        style={{ filter: isLocked ? `blur(${lockBlur}px)` : 'none' }}
      />
      <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
        <div className=" text-7xl">
          <Clock onlyTime={true} />
        </div>
        <div className="mt-4 text-xl font-medium">
          <Clock onlyDay={true} />
        </div>
        <div className=" mt-16 text-base">
          Click or Press a key to unlock
        </div>
      </div>
    </div>
  );
}
