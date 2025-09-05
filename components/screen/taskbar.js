import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import useGameAudio from '../../hooks/useGameAudio';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const { setVolume } = useGameAudio();
    const barRef = useRef(null);

    useEffect(() => {
        const el = barRef.current;
        if (!el) return;
        const enabled = typeof window !== 'undefined' &&
            localStorage.getItem('xfce.panel.scrollVolume') === 'true';
        if (!enabled) return;
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = -e.deltaY / 100;
            setVolume(prev => {
                const next = Math.max(0, Math.min(1, prev + delta));
                return next;
            });
        };
        el.addEventListener('wheel', handleWheel);
        return () => {
            el.removeEventListener('wheel', handleWheel);
        };
    }, [setVolume]);

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
        <div ref={barRef} className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
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
