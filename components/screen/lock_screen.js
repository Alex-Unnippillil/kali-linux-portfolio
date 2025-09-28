import React, { useEffect, useRef } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from '../util-components/kali-wallpaper';

export default function LockScreen(props) {

    const { bgImageName, useKaliWallpaper } = useSettings();
    const useKaliTheme = useKaliWallpaper || bgImageName === 'kali-gradient';
    const lockScreenRef = useRef(null);
    const unlockButtonRef = useRef(null);

    useEffect(() => {
        if (!props.isLocked) {
            return;
        }

        const handleWindowClick = (event) => {
            // Allow the unlock button to handle its own click without double invocation.
            if (event.target === unlockButtonRef.current) {
                return;
            }
            props.unLockScreen(event);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Tab') {
                const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
                const focusableElements = lockScreenRef.current
                    ? Array.from(lockScreenRef.current.querySelectorAll(focusableSelectors))
                        .filter((el) => !el.hasAttribute('disabled'))
                    : [];

                if (focusableElements.length === 0) {
                    event.preventDefault();
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }

            if (event.key === 'Enter') {
                props.unLockScreen(event);
            }
        };

        window.addEventListener('click', handleWindowClick);

        const container = lockScreenRef.current;
        container?.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('click', handleWindowClick);
            container?.removeEventListener('keydown', handleKeyDown);
        };
    }, [props.isLocked, props.unLockScreen]);

    useEffect(() => {
        if (props.isLocked && unlockButtonRef.current) {
            unlockButtonRef.current.focus();
        }
    }, [props.isLocked]);

    return (
        <div
            id="ubuntu-lock-screen"
            style={{ zIndex: "100", contentVisibility: 'auto' }}
            ref={lockScreenRef}
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
                <div className="mt-16 flex flex-col items-center gap-4 text-base">
                    <span>Press Enter or use the button below to unlock.</span>
                    <button
                        type="button"
                        ref={unlockButtonRef}
                        onClick={props.unLockScreen}
                        className="rounded-full bg-blue-500 px-6 py-2 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-transparent"
                    >
                        Unlock
                    </button>
                </div>
            </div>
        </div>
    )
}
