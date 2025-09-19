import React from 'react';
import Image from 'next/image';
import { TaskbarBadge } from '../ui/TaskbarBadge';
import { TaskbarProgressRing } from '../ui/TaskbarProgressRing';

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
            {runningApps.map(app => {
                const metadata = props.taskbar_metadata?.[app.id] || {};
                const badgeCount = metadata.badgeCount || 0;
                const badgeLabel = metadata.badgeLabel || `${badgeCount} pending updates for ${app.title}`;
                const progress = metadata.progress;
                const progressValue = progress ? progress.value : null;
                const progressStatus = progress?.status || 'normal';
                const progressLabel = progress?.label || `${app.title} ${Math.round(progressValue ?? 0)}% complete`;
                const labelParts = [app.title];
                if (badgeCount > 0) {
                    labelParts.push(badgeLabel);
                }
                if (progress && typeof progressValue === 'number') {
                    labelParts.push(progressLabel);
                }
                const buttonLabel = labelParts.join(', ');

                return (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={buttonLabel}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={() => handleClick(app)}
                        className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                            'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-70'}
                    >
                        <span className="flex items-center">
                            <span className="relative flex items-center justify-center w-5 h-5">
                                <Image
                                    width={24}
                                    height={24}
                                    className="w-5 h-5 relative z-10"
                                    src={app.icon.replace('./', '/')}
                                    alt=""
                                    sizes="24px"
                                />
                                {progress && typeof progressValue === 'number' ? (
                                    <TaskbarProgressRing
                                        appId={app.id}
                                        value={progressValue}
                                        status={progressStatus}
                                        srLabel={progressLabel}
                                    />
                                ) : null}
                                {badgeCount > 0 ? (
                                    <TaskbarBadge
                                        appId={app.id}
                                        count={badgeCount}
                                        srLabel={badgeLabel}
                                    />
                                ) : null}
                            </span>
                            <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                        </span>
                        {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
