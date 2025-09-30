import React from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {
    const { bgImageName, useKaliWallpaper } = useSettings();
    const prefersReducedMotion = usePrefersReducedMotion();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';

    const animatedContainerClass = props.isLocked ? ' visible translate-y-0 ' : ' invisible -translate-y-full ';
    const reducedMotionContainerClass = props.isLocked ? ' visible opacity-100 ' : ' invisible opacity-0 ';
    const containerClass = `${prefersReducedMotion ? reducedMotionContainerClass : animatedContainerClass} absolute outline-none bg-black bg-opacity-90 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen ${prefersReducedMotion ? '' : 'transform duration-500'}`;

    const animatedBackgroundClass = `${prefersReducedMotion ? '' : 'transform transition duration-500'} ${props.isLocked ? 'blur-sm' : 'blur-none'}`;

    if (props.isLocked) {
        window.addEventListener('click', props.unLockScreen);
        window.addEventListener('keypress', props.unLockScreen);
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            className={containerClass}>
            {useKaliTheme ? (
                <KaliWallpaper
                    className={`absolute top-0 left-0 h-full w-full z-20 ${animatedBackgroundClass}`}
                />
            ) : (
                <img
                    src={`/wallpapers/${bgImageName}.webp`}
                    alt=""
                    className={`absolute top-0 left-0 w-full h-full object-cover z-20 ${animatedBackgroundClass}`}
                />
            )}
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
    )
}
