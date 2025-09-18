import React from 'react';
import Image from 'next/image';

export default function Taskbar({
    apps,
    workspace,
    openApp,
    minimize,
    displayId,
    displayIndex = 0,
}) {
    const closed_windows = workspace?.closed_windows || {};
    const minimized_windows = workspace?.minimized_windows || {};
    const focused_windows = workspace?.focused_windows || {};

    const runningApps = apps.filter(app => closed_windows[app.id] === false);

    const handleClick = (app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 transition-transform"
            role="toolbar"
            data-display={displayId}
            style={{ transform: `translateX(${displayIndex * 100}%)` }}
        >
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className={(focused_windows[app.id] && !minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
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
                    {!focused_windows[app.id] && !minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                    )}
                </button>
            ))}
        </div>
    );
}
