"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

const UNLOCK_KEYS = ['Enter', ' ', 'Spacebar', 'Escape'];

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const effectiveBgImageName = bgImageName || props.bgImgName || 'wall-2';
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

        if (!props.isLocked) {
            return undefined;
        }

        const removeListeners = () => {
            window.removeEventListener('click', handleUnlock);
            window.removeEventListener('keydown', handleKeyDown);
        };

        const handleUnlock = () => {
            removeListeners();
            props.unLockScreen?.();
        };

        const handleKeyDown = (event) => {
            if (!props.isLocked) return;

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
    }, [focusLockTarget, props.isLocked, props.unLockScreen]);

    const wallpaperElement = useMemo(() => {
        const blurClass = props.isLocked ? 'blur-sm' : 'blur-none';
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
    }, [effectiveBgImageName, props.isLocked, useKaliTheme]);

    return (
        <div
            id="ubuntu-lock-screen"
            ref={containerRef}
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            aria-hidden={!props.isLocked}
            role={props.isLocked ? 'dialog' : undefined}
            aria-modal={props.isLocked ? true : undefined}
            tabIndex={-1}
            className={(props.isLocked ? " visible translate-y-0 " : " invisible -translate-y-full ") + " absolute outline-none bg-black bg-opacity-90 transform duration-500 motion-reduce:duration-0 motion-reduce:transition-none select-none top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"}>
            {wallpaperElement}
            <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                <button
                    type="button"
                    ref={unlockButtonRef}
                    className="sr-only"
                    onClick={props.unLockScreen}
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
                <button
                    type="button"
                    onClick={props.unLockScreen}
                    className="mt-6 px-6 py-3 rounded-md border border-white/40 bg-white/10 text-white font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black hover:bg-white/20"
                >
                    Unlock screen
                </button>
            </div>
        </div>
    );
}
