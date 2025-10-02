import React, { useCallback, useEffect, useRef, useState } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen({ isLocked, unLockScreen }) {
    const firstInputRef = useRef(null);
    const { bgImageName, useKaliWallpaper } = useSettings();
    const [showLogin, setShowLogin] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';

    const resetForm = useCallback(() => {
        setUsername('');
        setPassword('');
    }, []);

    const handleSubmit = useCallback(() => {
        resetForm();
        setShowLogin(false);
        unLockScreen?.();
    }, [resetForm, unLockScreen]);

    useEffect(() => {
        if (!isLocked) {
            setShowLogin(false);
            resetForm();
            return;
        }

        const handlePointerDown = () => {
            if (!showLogin) {
                setShowLogin(true);
            }
        };

        const handleKeyDown = (event) => {
            if (!isLocked) return;

            if (showLogin) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setShowLogin(false);
                    resetForm();
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSubmit();
                }
                return;
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (event.key.length === 1 || event.key === 'Enter' || event.key === ' ') {
                setShowLogin(true);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLocked, showLogin, resetForm, handleSubmit]);

    useEffect(() => {
        if (showLogin && firstInputRef.current) {
            firstInputRef.current.focus();
            firstInputRef.current.select();
        }
    }, [showLogin]);

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            className={(isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            {useKaliTheme ? (
                <KaliWallpaper
                    className={`absolute top-0 left-0 h-full w-full transform z-20 transition duration-500 ${isLocked ? 'blur-sm' : 'blur-none'}`}
                />
            ) : (
                <img
                    src={`/wallpapers/${bgImageName}.webp`}
                    alt=""
                    className={`absolute top-0 left-0 w-full h-full object-cover transform z-20 transition duration-500 ${isLocked ? 'blur-sm' : 'blur-none'}`}
                />
            )}
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white px-6">
                <div className="text-7xl">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium">
                    <Clock onlyDay={true} />
                </div>
                {!showLogin ? (
                    <div className="mt-16 text-base text-center">
                        Press any key or click to sign in
                    </div>
                ) : (
                    <form
                        className="mt-12 w-full max-w-sm rounded-lg bg-black/60 backdrop-blur p-6 shadow-lg"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-center">Unlock Desktop</h2>
                        <label className="block text-sm font-medium text-gray-200" htmlFor="lock-screen-username">
                            <span className="block">Username</span>
                            <input
                                ref={firstInputRef}
                                id="lock-screen-username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="mt-1 w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                                autoComplete="username"
                                aria-label="Username"
                            />
                        </label>
                        <label className="mt-4 block text-sm font-medium text-gray-200" htmlFor="lock-screen-password">
                            <span className="block">Password</span>
                            <input
                                id="lock-screen-password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-1 w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                                autoComplete="current-password"
                                aria-label="Password"
                            />
                        </label>
                        <p className="mt-4 text-xs text-gray-300 text-center">
                            Press Enter to unlock or Escape to cancel.
                        </p>
                        <button
                            type="submit"
                            className="mt-6 w-full rounded bg-cyan-500 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                        >
                            Unlock
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
