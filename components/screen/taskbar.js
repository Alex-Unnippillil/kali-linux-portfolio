import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';

const noop = () => {};

const getDataTransferId = (event, fallback) => {
    const transfer = event?.dataTransfer;
    if (transfer) {
        const id = transfer.getData('text/plain');
        if (id) return id;
    }
    return fallback ?? null;
};

const scheduleUpdate = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(callback);
        return;
    }
    setTimeout(callback, 0);
};

export default function Taskbar(props) {
    const {
        apps,
        pinnedAppIds = [],
        onReorderPinnedApps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
    } = props;

    const [draggedId, setDraggedId] = useState(null);
    const [announcement, setAnnouncement] = useState('');

    const pinnedSet = useMemo(() => new Set(pinnedAppIds), [pinnedAppIds]);
    const pinnedCount = pinnedAppIds.length;

    const pinnedApps = useMemo(
        () => pinnedAppIds.map((id) => apps.find((app) => app.id === id)).filter(Boolean),
        [apps, pinnedAppIds],
    );

    const runningApps = useMemo(
        () => apps.filter((app) => closed_windows[app.id] === false),
        [apps, closed_windows],
    );

    const extraRunningApps = useMemo(
        () => runningApps.filter((app) => !pinnedSet.has(app.id)),
        [runningApps, pinnedSet],
    );

    const announce = useCallback((message) => {
        setAnnouncement('');
        if (!message) return;
        scheduleUpdate(() => setAnnouncement(message));
    }, []);

    const movePinned = useCallback((sourceId, targetIndex) => {
        if (!pinnedSet.has(sourceId)) return;
        if (typeof targetIndex !== 'number' || Number.isNaN(targetIndex)) return;
        const current = [...pinnedAppIds];
        if (!current.includes(sourceId)) return;
        const withoutSource = current.filter((id) => id !== sourceId);
        const clampedIndex = Math.max(0, Math.min(targetIndex, withoutSource.length));
        withoutSource.splice(clampedIndex, 0, sourceId);
        const hasChanged =
            withoutSource.length !== current.length ||
            withoutSource.some((id, index) => id !== current[index]);
        if (!hasChanged) return;
        (onReorderPinnedApps || noop)(withoutSource);
        const app = apps.find((item) => item.id === sourceId);
        if (app) {
            announce(`${app.title} moved to position ${clampedIndex + 1} in dock`);
        }
    }, [announce, apps, onReorderPinnedApps, pinnedAppIds, pinnedSet]);

    const handleClick = useCallback((app) => {
        const id = app.id;
        const isClosed = closed_windows[id] !== false;
        const isMinimized = Boolean(minimized_windows[id]);
        const isFocused = Boolean(focused_windows[id]);
        if (isClosed) {
            openApp(id);
            return;
        }
        if (isMinimized) {
            openApp(id);
        } else if (isFocused) {
            minimize(id);
        } else {
            openApp(id);
        }
    }, [closed_windows, focused_windows, minimized_windows, minimize, openApp]);

    const handleDragStart = useCallback((event, appId) => {
        if (event?.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', appId);
        }
        setDraggedId(appId);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
    }, []);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        if (event?.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }, []);

    const handleDropOnItem = useCallback((event, targetId, targetIndex) => {
        event.preventDefault();
        event.stopPropagation();
        const sourceId = getDataTransferId(event, draggedId);
        if (!sourceId || sourceId === targetId) {
            setDraggedId(null);
            return;
        }
        movePinned(sourceId, targetIndex);
        setDraggedId(null);
    }, [draggedId, movePinned]);

    const handleDropOnContainer = useCallback((event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        const sourceId = getDataTransferId(event, draggedId);
        if (!sourceId) {
            setDraggedId(null);
            return;
        }
        movePinned(sourceId, pinnedCount);
        setDraggedId(null);
    }, [draggedId, movePinned, pinnedCount]);

    const renderTaskbarButton = useCallback((app, pinned) => {
        const isRunning = closed_windows[app.id] === false;
        const isMinimized = Boolean(minimized_windows[app.id]);
        const isFocused = Boolean(focused_windows[app.id]);
        const isActive = isRunning && !isMinimized;

        return (
            <button
                type="button"
                aria-label={app.title}
                data-context="taskbar"
                data-app-id={app.id}
                data-active={isActive ? 'true' : 'false'}
                aria-pressed={isActive}
                aria-grabbed={pinned ? (draggedId === app.id ? 'true' : 'false') : undefined}
                onClick={() => handleClick(app)}
                className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center justify-center rounded-lg transition-colors hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                style={{
                    minHeight: 'var(--shell-hit-target, 2.5rem)',
                    minWidth: 'var(--shell-hit-target, 2.5rem)',
                    paddingInline: 'calc(var(--shell-taskbar-padding-x, 0.75rem) * 0.75)',
                    fontSize: 'var(--shell-taskbar-font-size, 0.875rem)',
                    gap: '0.5rem',
                    cursor: pinned ? 'grab' : 'pointer',
                }}
                draggable={pinned}
                onDragStart={pinned ? (event) => handleDragStart(event, app.id) : undefined}
                onDragEnd={pinned ? handleDragEnd : undefined}
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
                {isActive && (
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
                )}
            </button>
        );
    }, [closed_windows, draggedId, focused_windows, handleClick, handleDragEnd, handleDragStart, minimized_windows]);

    return (
        <div
            className="absolute bottom-0 left-0 z-40 flex w-full items-center justify-start bg-black bg-opacity-50 backdrop-blur-sm"
            role="toolbar"
            style={{
                height: 'var(--shell-taskbar-height, 2.5rem)',
                paddingInline: 'var(--shell-taskbar-padding-x, 0.75rem)',
            }}
        >
            <div
                className="flex items-center overflow-x-auto"
                style={{ gap: 'var(--shell-taskbar-gap, 0.5rem)' }}
                onDragOver={handleDragOver}
                onDrop={handleDropOnContainer}
            >
                {pinnedApps.map((app, index) => (
                    <div
                        key={app.id}
                        className="group relative flex flex-col items-center"
                        onDragOver={handleDragOver}
                        onDrop={(event) => handleDropOnItem(event, app.id, index)}
                    >
                        <div className="pointer-events-auto absolute -top-10 flex gap-1 rounded-md bg-black/80 px-1 py-0.5 text-[0.65rem] text-white opacity-0 shadow-lg transition group-focus-within:opacity-100 group-hover:opacity-100">
                            <button
                                type="button"
                                className="rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
                                onClick={() => movePinned(app.id, index - 1)}
                                aria-label={`Move ${app.title} left`}
                                disabled={index === 0}
                            >
                                ◀
                            </button>
                            <button
                                type="button"
                                className="rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50"
                                onClick={() => movePinned(app.id, index + 1)}
                                aria-label={`Move ${app.title} right`}
                                disabled={index === pinnedApps.length - 1}
                            >
                                ▶
                            </button>
                        </div>
                        {renderTaskbarButton(app, true)}
                    </div>
                ))}
                {extraRunningApps.map((app) => (
                    <React.Fragment key={app.id}>
                        {renderTaskbarButton(app, false)}
                    </React.Fragment>
                ))}
            </div>
            <div role="status" aria-live="polite" className="sr-only">
                {announcement}
            </div>
        </div>
    );
}
