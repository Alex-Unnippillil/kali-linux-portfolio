"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';
import { defaults } from '../../utils/settingsStore';

const UNLOCK_KEYS = ['Enter', ' ', 'Spacebar', 'Escape'];

export default function LockScreen(props) {

    const { wallpaper, useKaliWallpaper } = useSettings();
    const { isLocked, unLockScreen } = props;
    const effectiveBgImageName = useKaliWallpaper ? 'kali-gradient' : wallpaper || defaults.wallpaper;
    const useKaliTheme = useKaliWallpaper || effectiveBgImageName === 'kali-gradient';
    const containerRef = useRef(null);
    const unlockButtonRef = useRef(null);

    const focusLockTarget = useCallback(() => {
        const focusEl = unlockButtonRef.current || containerRef.current;
        if (focusEl && typeof focusEl.focus === 'function') {
            focusEl.focus({ preventScroll: true });
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        if (!isLocked) {
            return undefined;
        }

        const removeListeners = () => {
            window.removeEventListener('click', handleUnlock);
            window.removeEventListener('keydown', handleKeyDown);
        };

        const handleUnlock = () => {
            removeListeners();
            unLockScreen?.();
        };

        const handleKeyDown = (event) => {
            if (!isLocked) return;

            if (event.key === 'Tab') {
                event.preventDefault();
                focusLockTarget();
                return;
            }

            if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                return;
            }

            if (UNLOCK_KEYS.includes(event.key)) {
                event.preventDefault();
                handleUnlock();
            }
        };

        focusLockTarget();

        window.addEventListener('click', handleUnlock, { once: true });
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            removeListeners();
        };
    }, [focusLockTarget, isLocked, unLockScreen]);

    const wallpaperElement = useMemo(() => {
        const blurClass = isLocked ? 'blur-sm' : 'blur-none';
        const transitionClasses = `absolute top-0 left-0 h-full w-full transform z-20 transition duration-500 motion-reduce:duration-0 motion-reduce:transition-none ${blurClass}`;

        if (useKaliTheme) {
            return (
                <KaliWallpaper
                    className={transitionClasses}
                />
            );
        }

        return (
            <img
                src={`/wallpapers/${effectiveBgImageName}.webp`}
                alt=""
                className={`${transitionClasses} object-cover`}
            />
        );
    }, [effectiveBgImageName, isLocked, useKaliTheme]);

    return (
        <div
            id="ubuntu-lock-screen"
            ref={containerRef}
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            aria-hidden={!isLocked}
            role={isLocked ? 'dialog' : undefined}
            aria-modal={isLocked ? true : undefined}
            tabIndex={-1}
            className={(isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 motion-reduce:duration-0 motion-reduce:transition-none select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            {wallpaperElement}
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                <button
                    type="button"
                    ref={unlockButtonRef}
                    className="sr-only"
                    onClick={unLockScreen}
                >
                    Unlock screen
                </button>
                <span className="sr-only">Press Enter, Space, or Escape to unlock.</span>
                <div className=" text-7xl">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium">
                    <Clock onlyDay={true} />
                </div>
                <div className=" mt-16 text-base">
                    Click or press Enter, Space, or Escape to unlock
                </div>
            </div>
        </div>
    );
}
