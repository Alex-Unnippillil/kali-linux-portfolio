import React from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = React.useMemo(
        () => props.apps.filter(app => props.closed_windows[app.id] === false),
        [props.apps, props.closed_windows]
    );
    const buttonRefs = React.useRef({});

    React.useEffect(() => {
        const activeIds = new Set(runningApps.map(app => app.id));
        Object.keys(buttonRefs.current).forEach((key) => {
            if (!activeIds.has(key)) {
                delete buttonRefs.current[key];
            }
        });
    }, [runningApps]);

    React.useEffect(() => {
        if (!props.pendingFocusId) return;
        const target = buttonRefs.current[props.pendingFocusId];
        if (target && typeof target.focus === 'function') {
            target.focus();
        }
        if (props.onPendingFocusHandled) {
            props.onPendingFocusHandled();
        }
    }, [props.pendingFocusId, props.onPendingFocusHandled]);

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

    const assignRef = React.useCallback((id) => (node) => {
        if (node) {
            buttonRefs.current[id] = node;
        } else {
            delete buttonRefs.current[id];
        }
    }, []);

    const showPreview = (event, app) => {
        if (props.onPreviewStart) {
            const rect = event.currentTarget.getBoundingClientRect();
            props.onPreviewStart(app.id, {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            });
        }
    };

    const hidePreview = () => {
        if (props.onPreviewEnd) {
            props.onPreviewEnd();
        }
    };

    const clearPreview = () => {
        if (props.onPreviewClear) {
            props.onPreviewClear();
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
                    ref={assignRef(app.id)}
                    onClick={() => {
                        handleClick(app);
                        clearPreview();
                    }}
                    onMouseEnter={(event) => showPreview(event, app)}
                    onMouseLeave={hidePreview}
                    onFocus={(event) => showPreview(event, app)}
                    onBlur={hidePreview}
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
