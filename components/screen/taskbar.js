import React from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const badges = props.badges || {};

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
            className="absolute bottom-0 left-0 z-40 flex w-full items-center justify-start bg-black bg-opacity-50 backdrop-blur-sm"
            role="toolbar"
            style={{
                minHeight: 'calc(var(--shell-taskbar-height, 2.5rem) + var(--safe-area-bottom, 0px))',
                paddingTop: '0.35rem',
                paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 0.35rem)',
                paddingLeft: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-left, 0px))',
                paddingRight: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-right, 0px))',
            }}
        >
            <div
                className="flex items-center overflow-x-auto"
                style={{ gap: 'var(--shell-taskbar-gap, 0.5rem)' }}
            >
                {runningApps.map(app => {
                    const isMinimized = Boolean(props.minimized_windows[app.id]);
                    const isFocused = Boolean(props.focused_windows[app.id]);
                    const isActive = !isMinimized;
                    const badge = badges[app.id] || null;
                    const hasText = badge && typeof badge.text === 'string' && badge.text.trim();
                    const progressValue = typeof badge?.progress === 'number' && Number.isFinite(badge.progress)
                        ? Math.min(1, Math.max(0, badge.progress))
                        : null;
                    const badgeText = hasText ? badge.text.trim() : null;
                    const badgeLabel = badgeText || (progressValue !== null ? `${Math.round(progressValue * 100)}%` : null);
                    const ariaLabel = badgeLabel ? `${app.title} (${badgeLabel})` : app.title;

                    return (
                        <button
                            key={app.id}
                            type="button"
                            aria-label={ariaLabel}
                            data-context="taskbar"
                            data-app-id={app.id}
                            data-active={isActive ? 'true' : 'false'}
                            aria-pressed={isActive}
                            onClick={() => handleClick(app)}
                            className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center justify-center rounded-lg transition-colors hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                            style={{
                                minHeight: 'var(--shell-hit-target, 2.5rem)',
                                minWidth: 'var(--shell-hit-target, 2.5rem)',
                                paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.75)',
                                fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
                                gap: '0.5rem',
                            }}
                        >
                            <Image
                                width={32}
                                height={32}
                                style={{
                                    width: 'var(--shell-taskbar-icon, 1.5rem)',
                                    height: 'var(--shell-taskbar-icon, 1.5rem)',
                                }}
                                src={app.icon.replace('./', '/')}
                                alt=""
                                sizes="(max-width: 768px) 32px, 40px"
                            />
                            <span
                                className="text-white whitespace-nowrap"
                                style={{ fontSize: 'var(--shell-taskbar-font-size, 0.875rem)' }}
                            >
                                {app.title}
                            </span>
                            {badgeLabel && (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-1 -right-1 rounded-full bg-ub-orange px-1 py-0.5 text-[0.6rem] font-semibold text-black"
                                >
                                    {badgeLabel}
                                </span>
                            )}
                            {progressValue !== null ? (
                                <span
                                    aria-hidden="true"
                                    className="absolute left-2 right-2 bottom-1 h-1 rounded bg-white/20 overflow-hidden"
                                >
                                    <span
                                        className="block h-full bg-ub-orange"
                                        style={{ width: `${Math.max(0, Math.min(100, progressValue * 100))}%` }}
                                    />
                                </span>
                            ) : (
                                isActive && (
                                    <span
                                        aria-hidden="true"
                                        data-testid="running-indicator"
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded"
                                        style={{
                                            width: '0.5rem',
                                            height: '0.25rem',
                                            background: 'currentColor',
                                        }}
                                    />
                                )
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
