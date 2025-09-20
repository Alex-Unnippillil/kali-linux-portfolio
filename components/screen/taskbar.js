import React from 'react';
import Image from 'next/image';
import useLocaleDirection from '../../hooks/useLocaleDirection';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const isRTL = useLocaleDirection() === 'rtl';

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
        <div className={`absolute bottom-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 ${isRTL ? 'right-0 flex-row-reverse' : 'left-0'}`} role="toolbar">
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                        `relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    <Image
                        width={24}
                        height={24}
                        className="w-5 h-5"
                        src={app.icon.replace('./', '/')}
                        alt=""
                        sizes="24px"
                    />
                    <span className={`${isRTL ? 'mr-1 ml-0' : 'ml-1 mr-0'} text-sm text-white whitespace-nowrap`}>{app.title}</span>
                    {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                    )}
                </button>
            ))}
        </div>
    );
}
