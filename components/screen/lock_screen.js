import React, { useEffect, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const dialogRef = useRef(null);
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

    useEffect(() => {
        if (!props.isLocked) {
            return undefined;
        }

        if (dialogRef.current) {
            dialogRef.current.focus();
        }

        return undefined;
    }, [props.isLocked]);

    return (
        <div
            id="ubuntu-lock-screen"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lock-screen-title"
            aria-describedby="lock-screen-description"
            tabIndex={-1}
            ref={dialogRef}
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            aria-hidden={props.isLocked ? "false" : "true"}
            className={(props.isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            {useKaliTheme ? (
                <KaliWallpaper
                    className={`absolute top-0 left-0 h-full w-full transform z-20 transition duration-500 ${props.isLocked ? 'blur-sm' : 'blur-none'}`}
                />
            ) : (
                <img
                    src={`/wallpapers/${bgImageName}.webp`}
                    alt=""
                    className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${props.isLocked ? 'blur-sm' : 'blur-none'}`}
                />
            )}
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                <h2 id="lock-screen-title" className="sr-only">
                    Screen locked
                </h2>
                <div className=" text-7xl">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium">
                    <Clock onlyDay={true} />
                </div>
                <div id="lock-screen-description" className=" mt-16 text-base">
                    Click or Press a key to unlock
                </div>
            </div>
        </div>
    )
}
