import React, { useEffect, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';
    const overlayRef = useRef(null);
    const previousFocusRef = useRef(null);
    const inertElementsRef = useRef([]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return undefined;
        }

        const restoreShellInteractivity = () => {
            inertElementsRef.current.forEach(({ element, alreadyInert }) => {
                if (!alreadyInert) {
                    element.removeAttribute('inert');
                }
            });
            inertElementsRef.current = [];
        };

        if (props.isLocked) {
            const activeElement = document.activeElement;
            previousFocusRef.current = activeElement && typeof activeElement.focus === 'function'
                ? activeElement
                : null;

            const layoutRoot = document.getElementById('monitor-screen');
            const overlayNode = overlayRef.current;
            if (layoutRoot && overlayNode) {
                const inertTargets = Array.from(layoutRoot.children).filter((child) => child !== overlayNode);
                inertElementsRef.current = inertTargets.map((element) => {
                    const alreadyInert = element.hasAttribute('inert');
                    if (!alreadyInert) {
                        element.setAttribute('inert', '');
                    }
                    return { element, alreadyInert };
                });
            } else {
                inertElementsRef.current = [];
            }

            const focusOverlay = () => {
                const target = overlayRef.current;
                if (target && typeof target.focus === 'function') {
                    try {
                        target.focus({ preventScroll: true });
                    } catch (err) {
                        target.focus();
                    }
                }
            };

            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(focusOverlay);
            } else {
                setTimeout(focusOverlay, 0);
            }

            return restoreShellInteractivity;
        }

        restoreShellInteractivity();

        const toRestore = previousFocusRef.current;
        if (toRestore && typeof toRestore.focus === 'function') {
            const focusTarget = () => {
                try {
                    toRestore.focus({ preventScroll: true });
                } catch (err) {
                    toRestore.focus();
                }
            };
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(focusTarget);
            } else {
                setTimeout(focusTarget, 0);
            }
        }
        previousFocusRef.current = null;

        return undefined;
    }, [props.isLocked]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        if (!props.isLocked) {
            return undefined;
        }

        const handleUnlock = props.unLockScreen;

        window.addEventListener('click', handleUnlock);
        window.addEventListener('keypress', handleUnlock);

        return () => {
            window.removeEventListener('click', handleUnlock);
            window.removeEventListener('keypress', handleUnlock);
        };
    }, [props.isLocked, props.unLockScreen]);

    return (
        <div
            id="ubuntu-lock-screen"
            ref={overlayRef}
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            role="dialog"
            aria-modal="true"
            aria-label="Lock screen overlay"
            tabIndex={-1}
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
