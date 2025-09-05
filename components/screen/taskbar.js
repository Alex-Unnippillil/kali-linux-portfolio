"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const PANEL_PREFIX = "xfce.panel.";

export default function Taskbar(props) {
    const [group, setGroup] = useState("auto");
    const [sort, setSort] = useState("timestamp");

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setGroup(localStorage.getItem(`${PANEL_PREFIX}group`) || "auto");
        setSort(localStorage.getItem(`${PANEL_PREFIX}sort`) || "timestamp");
    }, []);

    let runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

    if (group !== "never") {
        const groups = {};
        runningApps.forEach(app => {
            const key = app.id;
            const ts = props.window_timestamps[app.id] || 0;
            if (!groups[key]) groups[key] = { ...app, count: 0, timestamp: ts };
            groups[key].count += 1;
            groups[key].timestamp = Math.min(groups[key].timestamp, ts);
        });
        const hasDup = Object.values(groups).some(g => g.count > 1);
        if (group === "always" || (group === "auto" && hasDup)) {
            runningApps = Object.values(groups);
        }
    }

    if (sort === "alphabetical") {
        runningApps.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        runningApps.sort((a, b) => {
            const tA = a.timestamp !== undefined ? a.timestamp : (props.window_timestamps[a.id] || 0);
            const tB = b.timestamp !== undefined ? b.timestamp : (props.window_timestamps[b.id] || 0);
            return tA - tB;
        });
    }

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
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
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
                    {app.count > 1 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
                            {app.count}
                        </span>
                    )}
                    {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                    )}
                </button>
            ))}
        </div>
    );
}
