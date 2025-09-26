import React from 'react';
import Image from 'next/image';

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
        <div
            className="absolute bottom-0 left-0 w-full h-10 flex items-center z-40"
            role="toolbar"
            style={{
                backgroundColor: 'var(--kali-taskbar-bg)',
                color: 'var(--kali-text-strong)',
                backdropFilter: 'blur(14px)',
            }}
        >
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className="relative flex items-center mx-1 px-2 py-1 rounded transition-colors hover:bg-[color:var(--kali-taskbar-hover)] focus-visible:outline-none"
                    style={{
                        backgroundColor:
                            props.focused_windows[app.id] && !props.minimized_windows[app.id]
                                ? 'var(--kali-taskbar-active)'
                                : 'transparent',
                    }}
                >
                    <Image
                        width={24}
                        height={24}
                        className="w-5 h-5"
                        src={app.icon.replace('./', '/')}
                        alt=""
                        sizes="24px"
                    />
                    <span className="ml-1 text-sm text-[var(--kali-text-strong)] whitespace-nowrap">{app.title}</span>
                    {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                        <span
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 rounded"
                            style={{ backgroundColor: 'var(--kali-taskbar-indicator)' }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
