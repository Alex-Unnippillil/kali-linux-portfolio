import React, { useEffect, useRef, useState } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen(props) {

    const { wallpaper } = useSettings();
    const [powerOpen, setPowerOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setPowerOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (props.isLocked) {
        window.addEventListener('click', props.unLockScreen);
        window.addEventListener('keypress', props.unLockScreen);
    }

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
                <div className="text-7xl">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium">
                    <Clock onlyDay={true} />
                </div>
                <div className="mt-16 flex w-full max-w-md items-center justify-between px-6">
                    <button
                        tabIndex={0}
                        aria-label="User avatar"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="rounded-full focus:outline-none focus:ring"
                    >
                        <img
                            src="/themes/Yaru/status/contact.svg"
                            alt="Avatar"
                            className="w-24 h-24 rounded-full"
                        />
                    </button>
                    <select
                        tabIndex={0}
                        aria-label="Desktop session"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="bg-ub-grey bg-opacity-80 text-white p-2 rounded"
                    >
                        <option>Default</option>
                        <option>Wayland</option>
                    </select>
                </div>
                <div
                    ref={menuRef}
                    className="absolute bottom-8 right-8"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setPowerOpen(false);
                        }
                        e.stopPropagation();
                    }}
                >
                    <button
                        tabIndex={0}
                        aria-haspopup="true"
                        aria-expanded={powerOpen}
                        onClick={() => setPowerOpen(!powerOpen)}
                        className="px-4 py-2 bg-ub-grey bg-opacity-80 rounded focus:outline-none focus:ring"
                    >
                        Power
                    </button>
                    {powerOpen && (
                        <div
                            className="mt-2 flex flex-col rounded bg-ub-grey bg-opacity-80 text-left"
                            role="menu"
                        >
                            <button
                                className="px-4 py-2 opacity-50 cursor-not-allowed"
                                aria-disabled="true"
                                tabIndex={-1}
                            >
                                Shutdown
                            </button>
                            <button
                                className="px-4 py-2 opacity-50 cursor-not-allowed"
                                aria-disabled="true"
                                tabIndex={-1}
                            >
                                Restart
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
