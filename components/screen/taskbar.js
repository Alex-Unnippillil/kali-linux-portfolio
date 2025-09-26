import React from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const [hoveredAppId, setHoveredAppId] = React.useState(null);

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
                    aria-describedby={hoveredAppId === app.id ? `taskbar-tooltip-${app.id}` : undefined}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    onMouseEnter={() => setHoveredAppId(app.id)}
                    onMouseLeave={() => setHoveredAppId(null)}
                    onFocus={() => setHoveredAppId(app.id)}
                    onBlur={() => setHoveredAppId(null)}
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
                    {hoveredAppId === app.id && (
                        <div
                            id={`taskbar-tooltip-${app.id}`}
                            role="tooltip"
                            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 bg-opacity-90 px-2 py-1 text-xs text-white shadow-lg"
                        >
                            {app.title}
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
