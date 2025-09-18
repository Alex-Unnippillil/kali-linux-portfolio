import React, { useCallback, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

    const iconRefs = useRef(new Map());
    const lastPayload = useRef(null);

    const setIconRef = useCallback((id) => (node) => {
        if (!iconRefs.current) return;
        if (node) {
            iconRefs.current.set(id, node);
        } else {
            iconRefs.current.delete(id);
        }
    }, []);

    const computePositions = useCallback(() => {
        if (typeof document === 'undefined' || !props.reportIconPositions) return;
        const area = document.getElementById('window-area');
        if (!area) return;
        const areaRect = area.getBoundingClientRect();
        const payload = {};
        runningApps.forEach(app => {
            const node = iconRefs.current.get(app.id);
            if (!node) return;
            const rect = node.getBoundingClientRect();
            const x = rect.left - areaRect.left + rect.width / 2;
            const y = rect.top - areaRect.top + rect.height / 2;
            payload[app.id] = {
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2)),
            };
        });
        const serialized = JSON.stringify(payload);
        if (lastPayload.current !== serialized) {
            lastPayload.current = serialized;
            props.reportIconPositions(payload);
        }
    }, [runningApps, props.reportIconPositions]);

    useLayoutEffect(() => {
        computePositions();
    }, [computePositions]);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handler = () => computePositions();
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('resize', handler);
        };
    }, [computePositions]);

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
                    data-context="taskbar"
                    data-app-id={app.id}
                    ref={setIconRef(app.id)}
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
