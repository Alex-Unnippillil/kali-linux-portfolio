import React from 'react';
import Image from 'next/image';

export default function Taskbar({
    apps,
    closed_windows,
    minimized_windows,
    focused_windows,
    openApp,
    minimize,
    onDragHover,
    onDragLeave,
    isDesktopDragActive = false,
    raisedWindowId = null,
}) {
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

    const handleDragEnter = (event, appId) => {
        if (!isDesktopDragActive) return;
        event.preventDefault();
        if (typeof onDragHover === 'function') {
            onDragHover(appId);
        }
    };

    const handleDragOver = (event) => {
        if (!isDesktopDragActive) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDragLeave = (event, appId) => {
        if (!isDesktopDragActive) return;
        const related = event.relatedTarget;
        if (related && event.currentTarget.contains(related)) {
            return;
        }
        if (typeof onDragLeave === 'function') {
            onDragLeave(appId);
        }
    };

    const handleDrop = (event, appId) => {
        if (!isDesktopDragActive) return;
        event.preventDefault();
        if (typeof onDragLeave === 'function') {
            onDragLeave(appId);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    aria-description={isDesktopDragActive && raisedWindowId === app.id ? `${app.title} window raised for drop` : undefined}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    onDragEnter={(event) => handleDragEnter(event, app.id)}
                    onDragOver={handleDragOver}
                    onDragLeave={(event) => handleDragLeave(event, app.id)}
                    onDrop={(event) => handleDrop(event, app.id)}
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
