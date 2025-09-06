import React from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen(props) {

    const { wallpaper, wallpaperStyle } = useSettings();
    const styleMap = {
        fill: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' },
        fit: { backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' },
        stretch: { backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' },
        center: { backgroundSize: 'auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' },
        tile: { backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left' },
    };

    if (props.isLocked) {
        window.addEventListener('click', props.unLockScreen);
        window.addEventListener('keypress', props.unLockScreen);
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            className={(props.isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            <div
                className={`absolute top-0 left-0 w-full h-full transform z-20 transition duration-500 ${props.isLocked ? 'blur-sm' : 'blur-none'}`}
                style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, ...styleMap[wallpaperStyle] }}
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
    )
}
