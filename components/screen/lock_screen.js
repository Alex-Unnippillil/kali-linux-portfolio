import React from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';

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
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white px-6">
                <div
                    className="relative flex flex-col items-center text-center gap-6 px-10 py-12 md:px-16 md:py-14 backdrop-blur-xl"
                    style={{
                        background: 'var(--kali-panel)',
                        borderRadius: '24px',
                        border: '1px solid var(--kali-panel-border)',
                        boxShadow: '0 0 45px var(--kali-blue-glow)',
                    }}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div
                            className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border"
                            style={{
                                borderColor: 'var(--kali-panel-highlight)',
                                boxShadow: '0 0 25px var(--kali-blue-glow)',
                                background: 'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--kali-blue), transparent 10%) 0%, color-mix(in srgb, var(--kali-blue), transparent 40%) 45%, transparent 100%)',
                            }}
                        >
                            <img
                                src="/favicon.svg"
                                alt="Kali user avatar"
                                className="h-full w-full object-cover opacity-90"
                            />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-2xl font-semibold tracking-wide uppercase" style={{ color: 'var(--kali-text)' }}>
                                kali
                            </p>
                            <p className="text-sm font-medium text-[color:rgba(255,255,255,0.75)] max-w-[20ch]">
                                The quieter you become, the more you are able to hear.
                            </p>
                        </div>
                    </div>
                    <div
                        className="h-px w-full"
                        style={{
                            background: 'linear-gradient(90deg, transparent, var(--kali-blue), transparent)',
                            boxShadow: '0 0 20px var(--kali-blue-glow)',
                        }}
                    />
                    <div className="text-7xl font-light tracking-tight drop-shadow-lg">
                        <Clock onlyTime={true} />
                    </div>
                    <div className="text-xl font-medium opacity-80">
                        <Clock onlyDay={true} />
                    </div>
                    <div
                        className="h-px w-3/4"
                        style={{
                            background: 'linear-gradient(90deg, transparent, var(--kali-blue), transparent)',
                            boxShadow: '0 0 16px var(--kali-blue-glow)',
                        }}
                    />
                    <div className="text-base tracking-wide uppercase text-[color:rgba(255,255,255,0.85)]">
                        Click or press a key to unlock
                    </div>
                </div>
            </div>
        </div>
    )
}
