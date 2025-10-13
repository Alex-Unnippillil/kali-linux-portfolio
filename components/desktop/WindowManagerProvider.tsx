'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const WINDOW_SWITCHER_OVERLAY_ID = 'overlay-window-switcher';
const LAUNCHER_OVERLAY_ID = 'overlay-launcher';

type WindowManagerProviderProps = {
    children: ReactNode;
};

const WindowManagerProvider = ({ children }: WindowManagerProviderProps) => {
    const lastShortcutRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const dispatchTaskbarCommand = (detail: { appId: string; action: 'open' | 'toggle' | 'minimize' }) => {
            window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        const isLauncherActive = (): boolean => {
            if (typeof document === 'undefined') return false;
            const overlay = document.querySelector('[aria-labelledby="all-apps-overlay-title"]');
            if (!(overlay instanceof HTMLElement)) {
                return false;
            }
            return overlay.getAttribute('aria-hidden') !== 'true';
        };

        const markShortcut = (value: string): boolean => {
            if (lastShortcutRef.current === value) {
                return false;
            }
            lastShortcutRef.current = value;
            return true;
        };

        const resetShortcut = () => {
            lastShortcutRef.current = null;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) {
                return;
            }

            const { key } = event;

            if (event.altKey && !event.ctrlKey && !event.metaKey && key === 'Tab') {
                if (!markShortcut('alt+tab')) {
                    return;
                }
                event.preventDefault();
                dispatchTaskbarCommand({ appId: WINDOW_SWITCHER_OVERLAY_ID, action: 'open' });
                return;
            }

            if (event.ctrlKey && !event.metaKey && !event.altKey && key === 'Escape') {
                if (!markShortcut('ctrl+escape')) {
                    return;
                }
                event.preventDefault();
                dispatchTaskbarCommand({ appId: LAUNCHER_OVERLAY_ID, action: 'toggle' });
                return;
            }

            if (!event.altKey && !event.ctrlKey && !event.metaKey && key === 'Escape') {
                if (!isLauncherActive()) {
                    resetShortcut();
                    return;
                }
                if (!markShortcut('escape')) {
                    return;
                }
                event.preventDefault();
                dispatchTaskbarCommand({ appId: LAUNCHER_OVERLAY_ID, action: 'minimize' });
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (['Alt', 'Tab', 'Escape', 'Control'].includes(event.key)) {
                resetShortcut();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return <>{children}</>;
};

export default WindowManagerProvider;
