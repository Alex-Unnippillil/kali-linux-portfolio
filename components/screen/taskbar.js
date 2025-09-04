import React from 'react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export default function Taskbar(props) {
    const [autohideBehavior] = usePersistentState('xfce.panel.autohideBehavior', 'never');
    const [hidden, setHidden] = useState(autohideBehavior !== 'never');
    const hideTimer = useRef(null);

    const cancelHide = () => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        setHidden(false);
    };

    const scheduleHide = () => {
        if (autohideBehavior === 'never') return;
        const delay = autohideBehavior === 'intelligent' ? 500 : 100;
        hideTimer.current = setTimeout(() => setHidden(true), delay);
    };

    useEffect(() => {
        setHidden(autohideBehavior !== 'never');
    }, [autohideBehavior]);

    useEffect(() => {
        if (autohideBehavior === 'never') return;
        const handleMove = (e) => {
            if (e.clientY >= window.innerHeight - 5) {
                cancelHide();
            }
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [autohideBehavior]);

    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

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

    return (
        <div
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            className={`absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 transition-transform duration-200 ${hidden ? 'translate-y-full' : ''}`}
            role="toolbar"
        >
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
