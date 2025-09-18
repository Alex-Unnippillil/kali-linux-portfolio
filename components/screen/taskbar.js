import React, { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import Image from 'next/image';

const Taskbar = React.forwardRef(function Taskbar(props, ref) {
    const runningApps = useMemo(
        () => props.apps.filter(app => props.closed_windows[app.id] === false),
        [props.apps, props.closed_windows]
    );
    const buttonRefs = useRef(new Map());

    const registerButton = useCallback((appId) => (node) => {
        if (node) {
            buttonRefs.current.set(appId, node);
        } else {
            buttonRefs.current.delete(appId);
        }
    }, []);

    useImperativeHandle(ref, () => ({
        focusApp(appId) {
            const button = buttonRefs.current.get(appId);
            if (button) {
                button.focus();
                return true;
            }
            return false;
        },
        focusNext(direction = 1) {
            if (!runningApps.length) return null;
            const ids = runningApps.map(app => app.id);
            const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
            let index = ids.findIndex(id => buttonRefs.current.get(id) === activeElement);
            if (index === -1) {
                index = ids.findIndex(id => props.focused_windows[id]);
            }
            if (index === -1) {
                index = 0;
            }
            const step = direction >= 0 ? 1 : -1;
            const nextIndex = (index + step + ids.length) % ids.length;
            const nextId = ids[nextIndex];
            const button = buttonRefs.current.get(nextId);
            button?.focus();
            return nextId;
        }
    }), [runningApps, props.focused_windows]);

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
                    ref={registerButton(app.id)}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    onFocus={() => props.onFocusRequest?.(app.id)}
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
});

Taskbar.displayName = 'Taskbar';

export default Taskbar;
