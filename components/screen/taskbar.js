import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

function TaskbarItem({ app, focused, minimized, onClick, debug }) {
    const ref = useRef(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setWidth(el.getBoundingClientRect().width);
        update();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        ro && ro.observe(el);
        window.addEventListener('resize', update);
        return () => {
            ro && ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    return (
        <button
            ref={ref}
            type="button"
            aria-label={app.title}
            data-context="taskbar"
            data-app-id={app.id}
            onClick={onClick}
            className={(focused && !minimized ? ' bg-white bg-opacity-20 ' : ' ') +
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
            {!focused && !minimized && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
            )}
            {debug && (
                <div className="absolute inset-0 pointer-events-none border-2 border-red-500 text-red-500 text-[10px] flex flex-col">
                    <span className="m-auto text-center">{app.title} ({Math.round(width)}px)</span>
                    <div className="absolute left-0 top-0 bottom-0 border-l-2 border-red-500" />
                    <div className="absolute right-0 top-0 bottom-0 border-r-2 border-red-500" />
                </div>
            )}
        </button>
    );
}

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
                <TaskbarItem
                    key={app.id}
                    app={app}
                    focused={props.focused_windows[app.id]}
                    minimized={props.minimized_windows[app.id]}
                    onClick={() => handleClick(app)}
                    debug={props.debug}
                />
            ))}
        </div>
    );
}
