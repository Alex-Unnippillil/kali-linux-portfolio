import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import WhiskerMenu from '../menu/WhiskerMenu';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const launcherRef = useRef(null);
    const menuRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleClick = (app) => {
        const id = app.id;
        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    };

    const toggleMenu = useCallback(() => {
        if (menuRef.current && typeof menuRef.current.toggle === 'function') {
            menuRef.current.toggle();
        }
    }, []);

    useEffect(() => {
        const handleShortcut = (event) => {
            if (event.key === 'Meta' && !event.altKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault();
                toggleMenu();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [toggleMenu]);

    return (
        <div className="absolute bottom-0 left-0 z-40 flex h-10 w-full items-center gap-1 bg-black bg-opacity-50 px-2" role="toolbar">
            <button
                ref={launcherRef}
                type="button"
                aria-label="Open applications menu"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={toggleMenu}
                className="mr-2 flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold tracking-wide text-white transition hover:bg-white hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-ubb-orange focus:ring-offset-2 focus:ring-offset-black/40"
            >
                <Image
                    src="/themes/Yaru/status/icons8-kali-linux.svg"
                    alt="Kali applications menu"
                    width={24}
                    height={24}
                    sizes="24px"
                />
                <span className="hidden sm:inline">Applications</span>
            </button>
            <WhiskerMenu ref={menuRef} anchorRef={launcherRef} onOpenChange={setMenuOpen} />
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                        'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10'}
                >
                    <Image
                        width={24}
                        height={24}
                        className="w-5 h-5"
                        src={app.icon.replace('./', '/')}
                        alt=""
                        sizes="24px"
                    />
                    <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                    {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                    )}
                </button>
            ))}
        </div>
    );
}
