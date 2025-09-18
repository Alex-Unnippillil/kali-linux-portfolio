import React from 'react';
import Image from 'next/image';

const EMPTY_ATTENTION = { badgeCount: 0, pulse: false };

export default function Taskbar(props) {
    const {
        apps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
        attention_states = {},
    } = props;

    const runningApps = apps.filter(app => closed_windows[app.id] === false);

    const handleClick = (app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => {
                const attention = attention_states[app.id] || EMPTY_ATTENTION;
                const hasBadge = attention.badgeCount > 0;
                const badgeValue = attention.badgeCount > 99 ? '99+' : `${attention.badgeCount}`;
                const badgeLabel = hasBadge
                    ? `${attention.badgeCount > 99 ? '99+' : attention.badgeCount} notification${attention.badgeCount === 1 ? '' : 's'}`
                    : null;
                const attentionParts = [];
                if (badgeLabel) attentionParts.push(badgeLabel);
                if (attention.pulse) attentionParts.push('needs your attention');
                const ariaLabel = attentionParts.length
                    ? `${app.title} (${attentionParts.join(', ')})`
                    : app.title;

                const isFocused = focused_windows[app.id] && !minimized_windows[app.id];

                return (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={ariaLabel}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={() => handleClick(app)}
                        className={
                            (isFocused ? 'bg-white/20 ' : '') +
                            'relative mx-1 flex items-center rounded px-2 py-1 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ' +
                            (attention.pulse ? 'motion-safe:animate-taskbar-pulse ring-1 ring-amber-200/70 ' : '')
                        }
                    >
                        <span className="relative flex items-center">
                            <Image
                                width={24}
                                height={24}
                                className={`h-5 w-5 transition-transform duration-200 ${attention.pulse ? 'motion-safe:animate-taskbar-icon' : ''}`}
                                src={app.icon.replace('./', '/')}
                                alt=""
                                sizes="24px"
                            />
                            {hasBadge && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white shadow-lg motion-safe:animate-badge-pop"
                                    >
                                        {badgeValue}
                                    </span>
                                    <span className="sr-only" role="status" aria-live="polite">
                                        {badgeLabel}
                                    </span>
                                </>
                            )}
                        </span>
                        <span className="ml-1 whitespace-nowrap text-sm text-white">{app.title}</span>
                        {!focused_windows[app.id] && !minimized_windows[app.id] && (
                            <span
                                className={`absolute bottom-0 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded transition-colors duration-200 ${attention.pulse ? 'bg-amber-200' : 'bg-white'}`}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
