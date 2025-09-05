import React, { useEffect, useRef, useState } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen(props) {
    const {
        wallpaper,
        lockClock,
        lockDate,
        lockBlur,
        lockPasswordFocus,
        lockCapsLock,
    } = useSettings();

    const passwordRef = useRef(null);
    const [caps, setCaps] = useState(false);

    useEffect(() => {
        if (props.isLocked) {
            window.addEventListener('click', props.unLockScreen);
            return () => window.removeEventListener('click', props.unLockScreen);
        }
    }, [props.isLocked, props.unLockScreen]);

    useEffect(() => {
        if (props.isLocked && lockPasswordFocus) {
            passwordRef.current?.focus();
        }
    }, [props.isLocked, lockPasswordFocus]);

    const handleKey = (e) => {
        setCaps(e.getModifierState && e.getModifierState('CapsLock'));
        if (e.key === 'Enter') {
            props.unLockScreen();
        }
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: '100', contentVisibility: 'auto' }}
            className={(props.isLocked ? ' visible translate-y-0 ' : ' invisible -translate-y-full ') + ' absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen'}>
            <img
                src={`/wallpapers/${wallpaper}.webp`}
                alt=""
                className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${props.isLocked && lockBlur ? 'blur-sm' : 'blur-none'}`}
            />
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                {lockClock && (
                    <div className=" text-7xl">
                        <Clock onlyTime={true} />
                    </div>
                )}
                {lockDate && (
                    <div className="mt-4 text-xl font-medium">
                        <Clock onlyDay={true} />
                    </div>
                )}
                <input
                    ref={passwordRef}
                    type="password"
                    onKeyUp={handleKey}
                    className="mt-8 bg-black bg-opacity-50 text-white px-4 py-2 rounded"
                    aria-label="Password"
                />
                {lockCapsLock && caps && (
                    <div className="mt-2 text-sm text-red-500">Caps Lock is on</div>
                )}
                <div className=" mt-16 text-base">
                    Click or Press Enter to unlock
                </div>
            </div>
        </div>
    );
}

