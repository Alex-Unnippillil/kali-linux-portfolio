import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

export default function LockScreen({ isLocked, unLockScreen }) {
    const { wallpaper, lockScreenOverlay } = useSettings();
    const containerRef = useRef(null);

    const backgroundImage = useMemo(() => `/wallpapers/${wallpaper}.webp`, [wallpaper]);

    const handleUnlock = useCallback(() => {
        unLockScreen();
    }, [unLockScreen]);

    useEffect(() => {
        if (!isLocked || !lockScreenOverlay) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.repeat) {
                return;
            }
            if (event.key === 'Escape' || event.key === 'Esc') {
                event.preventDefault();
                handleUnlock();
            } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
                event.preventDefault();
                handleUnlock();
            }
        };

        const node = containerRef.current;
        node?.focus({ preventScroll: true });

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleUnlock, isLocked, lockScreenOverlay]);

    useEffect(() => {
        if (isLocked && !lockScreenOverlay) {
            handleUnlock();
        }
    }, [handleUnlock, isLocked, lockScreenOverlay]);

    if (!lockScreenOverlay) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            id="ubuntu-lock-screen"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{ zIndex: 100, contentVisibility: 'auto' }}
            onClick={handleUnlock}
            className={
                (isLocked
                    ? 'pointer-events-auto opacity-100 translate-y-0 '
                    : 'pointer-events-none opacity-0 -translate-y-6 ') +
                'fixed inset-0 m-0 h-screen w-screen overflow-hidden select-none outline-none transition duration-300 ease-out'
            }
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 scale-105 transform"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    filter: 'blur(20px) saturate(1.2)',
                }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center text-white">
                <div className="text-7xl font-light tracking-tight drop-shadow-lg">
                    <Clock onlyTime={true} />
                </div>
                <div className="mt-4 text-xl font-medium tracking-wide drop-shadow">
                    <Clock onlyDay={true} />
                </div>
                <div className="mt-16 text-base text-ubt-grey">
                    Click or press Esc to unlock
                </div>
            </div>
        </div>
    );
}
