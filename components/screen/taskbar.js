import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

export default function Taskbar(props) {
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
        <div className="absolute bottom-0 left-0 flex h-10 w-full items-center justify-between bg-black bg-opacity-50 px-2 z-40" role="toolbar">
            <WorkspaceSwitcher />
            <div className="flex flex-1 items-center justify-center overflow-x-auto">
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
        </div>
    );
}
