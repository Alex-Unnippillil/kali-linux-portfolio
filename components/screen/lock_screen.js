import React, { useState, useRef, useEffect } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen(props) {

    const { wallpaper } = useSettings();
    const [password, setPassword] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (props.isLocked) {
            inputRef.current?.focus();
        }
    }, [props.isLocked]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setPassword('');
        props.unLockScreen();
    };

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            className={(props.isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            <img
                src={`/wallpapers/${wallpaper}.webp`}
                alt=""
                className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${props.isLocked ? 'blur-md' : 'blur-none'}`}
            />
            <div className="w-full h-full z-50 relative flex flex-col items-center justify-center text-white">
                <div className="absolute top-10 text-center">
                    <div className="text-7xl">
                        <Clock onlyTime={true} />
                    </div>
                    <div className="mt-2 text-xl font-medium">
                        <Clock onlyDay={true} />
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="bg-black bg-opacity-50 p-8 rounded flex flex-col items-center">
                    <img src="/images/logos/bitmoji.png" alt="avatar" className="w-24 h-24 rounded-full mb-4 border-2 border-white" />
                    <div className="text-2xl mb-4">kali</div>
                    <input
                        ref={inputRef}
                        type="password"
                        className="px-4 py-2 rounded bg-gray-800 focus:outline-none"
                        placeholder="Password"
                        aria-label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </form>
            </div>
        </div>
    )
}
