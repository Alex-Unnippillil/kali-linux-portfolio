import React, { useContext, useMemo } from 'react';
import Image from 'next/image';
import { NotificationsContext } from '../common/NotificationCenter';

export default function Taskbar(props) {
    const notificationsCtx = useContext(NotificationsContext);
    const notifications = notificationsCtx?.notifications || {};

    const pinnedApps = useMemo(
        () => props.apps.filter(app => props.favourite_apps?.[app.id]),
        [props.apps, props.favourite_apps]
    );

    const runningUnpinned = useMemo(
        () => props.apps.filter(app => props.closed_windows[app.id] === false && !props.favourite_apps?.[app.id]),
        [props.apps, props.closed_windows, props.favourite_apps]
    );

    const messagingAppIds = useMemo(
        () => new Set(props.apps.filter(app => app.category === 'messaging').map(app => app.id)),
        [props.apps]
    );

    const panelApps = [...pinnedApps, ...runningUnpinned];

    const handleClick = (event, app) => {
        const id = app.id;

        if (event.shiftKey) {
            props.openApp(id, { spawnNew: true });
            return;
        }

        if (event.altKey && props.closed_windows[id] === false) {
            props.minimize(id);
            return;
        }

        if (props.minimized_windows[id]) {
            props.openApp(id);
            return;
        }

        if (props.closed_windows[id] === false) {
            if (!props.focused_windows[id]) {
                props.openApp(id);
            }
            return;
        }

        props.openApp(id);
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {panelApps.map(app => {
                const isRunning = props.closed_windows[app.id] === false;
                const isMinimized = !!props.minimized_windows[app.id];
                const isFocused = isRunning && !isMinimized && props.focused_windows[app.id];
                const badgeCount = messagingAppIds.has(app.id)
                    ? (notifications[app.id]?.length || 0)
                    : 0;
                const className = `${
                    isFocused ? 'bg-white bg-opacity-20 ' : ''
                }relative flex items-center mx-1 px-2 py-1 rounded transition-colors duration-150 hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-40`;
                const labelClass = `ml-1 text-sm whitespace-nowrap ${
                    isRunning ? 'text-white' : 'text-white text-opacity-70'
                }`;

                return (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={app.title}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={(event) => handleClick(event, app)}
                        className={className}
                        aria-pressed={isFocused}
                    >
                        <Image
                            width={24}
                            height={24}
                            className="w-5 h-5"
                            src={app.icon.replace('./', '/')}
                            alt=""
                            sizes="24px"
                        />
                        <span className={labelClass}>{app.title}</span>
                        {isFocused && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-white rounded-full" />
                        )}
                        {badgeCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[1.25rem] px-1 py-0.5 rounded-full bg-red-500 text-white text-xs leading-none text-center">
                                {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
