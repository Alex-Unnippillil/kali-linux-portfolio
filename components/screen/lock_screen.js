import React, { useEffect, useState } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';
    const [isPinVisible, setIsPinVisible] = useState(false);

    useEffect(() => {
        if (!props.isLocked) {
            setIsPinVisible(false);
        }
    }, [props.isLocked]);

    if (props.isLocked) {
        window.addEventListener('click', props.unLockScreen);
        window.addEventListener('keypress', props.unLockScreen);
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
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
                <div className=" text-7xl">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium">
                    <Clock onlyDay={true} />
                </div>
                <div className="mt-10 w-72 max-w-full">
                    <label className="sr-only" htmlFor="lock-screen-pin">
                        Enter PIN
                    </label>
                    <div className="relative flex items-center">
                        <input
                            id="lock-screen-pin"
                            type={isPinVisible ? 'text' : 'password'}
                            inputMode="numeric"
                            autoComplete="off"
                            aria-describedby="lock-screen-pin-help"
                            aria-label="Lock screen PIN"
                            className="w-full rounded-lg bg-white/10 px-4 py-2 text-lg tracking-widest placeholder-white/40 shadow-inner outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            placeholder="••••"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPinVisible((visible) => !visible)}
                            aria-label={isPinVisible ? 'Hide PIN' : 'Show PIN'}
                            aria-pressed={isPinVisible}
                            className="absolute right-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/40 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:bg-white/30"
                        >
                            {isPinVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    <p id="lock-screen-pin-help" className="mt-2 text-sm text-white/70">
                        Toggle the eye icon to show or hide the PIN.
                    </p>
                </div>
                <div className=" mt-16 text-base">
                    Click or Press a key to unlock
                </div>
            </div>
        </div>
    )
}

function EyeIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path
                d="M1.5 12s3.75-6 10.5-6 10.5 6 10.5 6-3.75 6-10.5 6S1.5 12 1.5 12Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5"
            aria-hidden="true"
        >
            <path
                d="M3 3l18 18"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9.88 9.88A3 3 0 0114.12 14.12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.1 7.1C4.64 8.64 3 12 3 12s3.75 6 9 6a8.94 8.94 0 003.9-.86"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 6c3.22 0 5.89 1.6 7.68 3.2a16.2 16.2 0 012.32 2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
