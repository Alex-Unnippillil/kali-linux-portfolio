import React from 'react';
import Image from 'next/image';
import Button from '../ui/Button';

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
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => (
                <Button
                    key={app.id}
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    variant="ghost"
                    size="sm"
                    className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? 'bg-white/20 ' : '') +
                        'relative mx-1 flex items-center gap-1 px-2 py-1 text-white hover:bg-white/10 justify-start'}
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
                </Button>
            ))}
        </div>
    );
}
