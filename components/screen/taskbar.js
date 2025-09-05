import React, { useState } from 'react';
import Image from 'next/image';
import usePanelSettings from '../../hooks/usePanelSettings';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const [panelSettings] = usePanelSettings();
    const { size, mode, autohide, background } = panelSettings;
    const [hover, setHover] = useState(false);

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

    const hiddenClass = autohide && !hover ? (mode === 'top' ? '-translate-y-full' : 'translate-y-full') : '';
    return (
        <div
            role="toolbar"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className={`absolute ${mode === 'top' ? 'top-0' : 'bottom-0'} left-0 w-full flex items-center z-40 transition-transform duration-300 ${hiddenClass}`}
            style={{ height: size, background }}
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
