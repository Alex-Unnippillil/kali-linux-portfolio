import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const PANEL_PREFIX = 'xfce.panel.';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

    const [rowHeight, setRowHeight] = useState(() => {
        if (typeof window === 'undefined') return 40;
        const stored = localStorage.getItem(`${PANEL_PREFIX}size`);
        return stored ? parseInt(stored, 10) : 40;
    });

    const [rows, setRows] = useState(() => {
        if (typeof window === 'undefined') return 1;
        const stored = localStorage.getItem(`${PANEL_PREFIX}rows`);
        return stored ? parseInt(stored, 10) : 1;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            const h = localStorage.getItem(`${PANEL_PREFIX}size`);
            const r = localStorage.getItem(`${PANEL_PREFIX}rows`);
            setRowHeight(h ? parseInt(h, 10) : 40);
            setRows(r ? parseInt(r, 10) : 1);
        };
        window.addEventListener('storage', handler);
        handler();
        return () => window.removeEventListener('storage', handler);
    }, []);

    const totalHeight = rowHeight * rows;
    const iconSize = rowHeight;

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
            className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 flex flex-wrap items-center content-start overflow-hidden z-40"
            role="toolbar"
            style={{ height: totalHeight }}
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
                        'relative flex items-center mx-1 px-1 rounded hover:bg-white hover:bg-opacity-10'}
                    style={{ height: rowHeight }}
                >
                    <Image
                        width={iconSize}
                        height={iconSize}
                        style={{ width: iconSize, height: iconSize, maxWidth: rowHeight, maxHeight: rowHeight }}
                        src={app.icon.replace('./', '/')}
                        alt=""
                        sizes={`${iconSize}px`}
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
