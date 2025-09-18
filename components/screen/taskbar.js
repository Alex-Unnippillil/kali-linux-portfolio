import React from 'react';
import Image from 'next/image';

export default function Taskbar({
    apps,
    closed_windows,
    minimized_windows,
    focused_windows,
    openApp,
    requestMinimize,
}) {
    const runningApps = apps.filter(app => closed_windows[app.id] === false);

    const handleClick = (app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            requestMinimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => {
                const id = app.id;
                const isMinimized = minimized_windows[id];
                const isFocused = focused_windows[id] && !isMinimized;
                const buttonClasses = [
                    'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10'
                ];
                if (isFocused) {
                    buttonClasses.push('bg-white bg-opacity-20');
                } else if (isMinimized) {
                    buttonClasses.push('opacity-70');
                }
                const indicatorClass = isMinimized
                    ? 'bg-white bg-opacity-40'
                    : 'bg-white';

                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={app.title}
                        aria-pressed={isFocused}
                        data-context="taskbar"
                        data-app-id={id}
                        data-state={isFocused ? 'active' : isMinimized ? 'minimized' : 'background'}
                        onClick={() => handleClick(app)}
                        className={buttonClasses.join(' ')}
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
                        <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 rounded ${indicatorClass}`} />
                    </button>
                );
            })}
        </div>
    );
}
