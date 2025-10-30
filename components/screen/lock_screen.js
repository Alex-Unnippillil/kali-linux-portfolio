import React, { useEffect } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        if (!props.isLocked) {
            return undefined;
        }

        const handleUnlock = props.unLockScreen;

        window.addEventListener('click', handleUnlock);
        window.addEventListener('keypress', handleUnlock);

        return () => {
            window.removeEventListener('click', handleUnlock);
            window.removeEventListener('keypress', handleUnlock);
        };
    }, [props.isLocked, props.unLockScreen]);

    const wallpaperBaseClass =
        'absolute inset-0 h-full w-full transform transition duration-700 ease-out';
    const wallpaperEffects = props.isLocked
        ? 'scale-105 blur-lg brightness-75 saturate-125'
        : 'scale-100 blur-0 brightness-100 saturate-100';

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            aria-hidden={props.isLocked ? "false" : "true"}
            className={`${
                props.isLocked ? 'visible translate-y-0' : 'invisible -translate-y-full'
            } absolute top-0 right-0 m-0 h-screen w-screen overflow-hidden p-0 outline-none bg-black/70 backdrop-blur-sm transition-transform duration-500 select-none`}
        >
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                {useKaliTheme ? (
                    <div className={`${wallpaperBaseClass} ${wallpaperEffects} filter`}>
                        <KaliWallpaper className="h-full w-full" />
                    </div>
                ) : (
                    <img
                        src={`/wallpapers/${bgImageName}.webp`}
                        alt=""
                        className={`${wallpaperBaseClass} ${wallpaperEffects} filter object-cover object-center`}
                        loading="lazy"
                    />
                )}
                <div
                    className={`absolute inset-0 transition duration-700 ${
                        props.isLocked
                            ? 'bg-gradient-to-b from-black/40 via-black/55 to-black/80'
                            : 'bg-black/10'
                    }`}
                    aria-hidden="true"
                />
            </div>
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center overflow-hidden text-white">
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
    )
}
