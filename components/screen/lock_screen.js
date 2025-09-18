import React from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen(props) {

    const { wallpaper } = useSettings();

    if (props.isLocked) {
        window.addEventListener('click', props.unLockScreen);
        window.addEventListener('keypress', props.unLockScreen);
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            className={(props.isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            <img
                src={`/wallpapers/${wallpaper}.webp`}
                alt=""
                className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${props.isLocked ? 'blur-sm' : 'blur-none'}`}
            />
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                <Image
                    src="/assets/branding/kali-dragon.svg"
                    alt="Kali Linux dragon logo"
                    width={220}
                    height={220}
                    className="w-24 h-24 sm:w-32 sm:h-32 mb-8 drop-shadow-[0_8px_16px_rgba(4,17,41,0.6)]"
                    priority
                    sizes="(max-width: 640px) 96px, 128px"
                />
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
