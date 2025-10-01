import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getAppMetadata, getPinnedAppIds, reorderPinnedApps, subscribePinnedApps } from '../../utils/taskbar';

function mergeTaskbarItems(runningApps = [], pinned = []) {
        const pinnedSet = new Set(pinned);
        const runningMap = new Map();
        runningApps.forEach((app) => {
                runningMap.set(app.id, {
                        ...app,
                        icon: app.icon ? app.icon : '',
                        isPinned: pinnedSet.has(app.id),
                        isRunning: true,
                });
        });

        const merged = [];

        pinned.forEach((id) => {
                const running = runningMap.get(id);
                if (running) {
                        merged.push(running);
                        runningMap.delete(id);
                        return;
                }
                const meta = getAppMetadata(id);
                if (!meta) return;
                merged.push({
                        id,
                        title: meta.title,
                        icon: meta.icon,
                        isFocused: false,
                        isMinimized: false,
                        isPinned: true,
                        isRunning: false,
                });
        });

        runningApps.forEach((app) => {
                if (pinnedSet.has(app.id)) return;
                const running = runningMap.get(app.id);
                if (running) {
                        merged.push({
                                ...running,
                                isPinned: false,
                                isRunning: true,
                        });
                }
        });

        return merged;
}

function normalizeIconPath(path = '') {
        if (!path) return path;
        return path.startsWith('/') ? path : path.replace('./', '/');
}

const Taskbar = ({ runningApps = [], onTaskbarCommand }) => {
        const [pinned, setPinned] = useState(() => getPinnedAppIds());
        const dragSourceIndex = useRef(null);
        const pendingFocusId = useRef(null);
        const buttonRefs = useRef(new Map());

        useEffect(() => {
                return subscribePinnedApps((nextPinned) => {
                        setPinned(nextPinned);
                });
        }, []);

        useEffect(() => {
                if (!pendingFocusId.current) return;
                const node = buttonRefs.current.get(pendingFocusId.current);
                if (node) {
                        node.focus();
                }
                pendingFocusId.current = null;
        }, [pinned, runningApps]);

        const items = useMemo(() => {
                return mergeTaskbarItems(runningApps, pinned).map((item) => ({
                        ...item,
                        icon: normalizeIconPath(item.icon),
                }));
        }, [runningApps, pinned]);

        const registerButtonRef = useCallback((id, node) => {
                if (!id) return;
                if (node) {
                        buttonRefs.current.set(id, node);
                } else {
                        buttonRefs.current.delete(id);
                }
        }, []);

        const handleCommand = useCallback(
                (appId, action = 'toggle') => {
                        if (typeof onTaskbarCommand === 'function') {
                                onTaskbarCommand({ appId, action });
                        }
                },
                [onTaskbarCommand],
        );

        const handleClick = useCallback(
                (event, item) => {
                        event.preventDefault();
                        handleCommand(item.id, 'toggle');
                },
                [handleCommand],
        );

        const handleKeyDown = useCallback(
                (event, item) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleCommand(item.id, 'toggle');
                                return;
                        }

                        if (!item.isPinned) return;

                        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                                event.preventDefault();
                                const pinnedIndex = pinned.indexOf(item.id);
                                if (pinnedIndex === -1) return;
                                const direction = event.key === 'ArrowUp' ? -1 : 1;
                                const targetIndex = pinnedIndex + direction;
                                if (targetIndex < 0 || targetIndex >= pinned.length) return;
                                reorderPinnedApps(pinnedIndex, targetIndex);
                                pendingFocusId.current = item.id;
                        }
                },
                [handleCommand, pinned],
        );

        const handleDragStart = useCallback(
                (event, item) => {
                        if (!item.isPinned) {
                                event.preventDefault();
                                return;
                        }
                        const pinnedIndex = pinned.indexOf(item.id);
                        if (pinnedIndex === -1) {
                                event.preventDefault();
                                return;
                        }
                        dragSourceIndex.current = pinnedIndex;
                        if (event.dataTransfer) {
                                event.dataTransfer.setData('text/plain', item.id);
                                event.dataTransfer.setDragImage(event.currentTarget, 0, 0);
                                event.dataTransfer.effectAllowed = 'move';
                        }
                },
                [pinned],
        );

        const handleDragOver = useCallback((event, item) => {
                if (!item.isPinned) return;
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        }, []);

        const handleDrop = useCallback(
                (event, item) => {
                        if (!item.isPinned) return;
                        const targetIndex = pinned.indexOf(item.id);
                        const sourceIndex = dragSourceIndex.current;
                        if (sourceIndex == null || targetIndex === -1) return;
                        event.preventDefault();
                        reorderPinnedApps(sourceIndex, targetIndex);
                        if (event.dataTransfer) {
                                const draggedId = event.dataTransfer.getData('text/plain');
                                pendingFocusId.current = draggedId || item.id;
                        } else {
                                pendingFocusId.current = item.id;
                        }
                        dragSourceIndex.current = null;
                },
                [pinned],
        );

        const handleDragEnd = useCallback(() => {
                dragSourceIndex.current = null;
        }, []);

        const handleListDragOver = useCallback((event) => {
                if (dragSourceIndex.current == null) return;
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        }, []);

        const handleListDrop = useCallback(
                (event) => {
                        const sourceIndex = dragSourceIndex.current;
                        if (sourceIndex == null) return;
                        event.preventDefault();
                        reorderPinnedApps(sourceIndex, pinned.length - 1);
                        const ordered = getPinnedAppIds();
                        pendingFocusId.current = ordered[ordered.length - 1] || null;
                        dragSourceIndex.current = null;
                },
                [pinned.length],
        );

        if (!items.length) {
                        return null;
        }

        return (
                <ul
                        className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                        role="list"
                        aria-label="Pinned and open applications"
                        onDragOver={handleListDragOver}
                        onDrop={handleListDrop}
                >
                        {items.map((item) => {
                                const isActive = item.isRunning && !item.isMinimized;
                                const isFocused = item.isRunning && item.isFocused && isActive;
                                const pinnedIndex = pinned.indexOf(item.id);
                                const draggable = item.isPinned;
                                const ariaLabel = item.title;
                                return (
                                        <li key={item.id} className="flex">
                                                <button
                                                        type="button"
                                                        ref={(node) => registerButtonRef(item.id, node)}
                                                        aria-label={ariaLabel}
                                                        aria-pressed={isActive}
                                                        data-context="taskbar"
                                                        data-app-id={item.id}
                                                        data-active={isActive ? 'true' : 'false'}
                                                        data-pinned={item.isPinned ? 'true' : 'false'}
                                                        data-running={item.isRunning ? 'true' : 'false'}
                                                        draggable={draggable}
                                                        onDragStart={(event) => handleDragStart(event, item)}
                                                        onDragOver={(event) => handleDragOver(event, item)}
                                                        onDrop={(event) => handleDrop(event, item)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(event) => handleClick(event, item)}
                                                        onKeyDown={(event) => handleKeyDown(event, item)}
                                                        className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} ${
                                                                item.isRunning ? 'text-white/80' : 'text-white/50'
                                                        } relative flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                                                >
                                                        <span className="relative inline-flex items-center justify-center">
                                                                <Image
                                                                        src={item.icon}
                                                                        alt=""
                                                                        width={28}
                                                                        height={28}
                                                                        className="h-6 w-6"
                                                                />
                                                                {item.isRunning && isActive && (
                                                                        <span
                                                                                aria-hidden="true"
                                                                                data-testid="running-indicator"
                                                                                className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
                                                                        />
                                                                )}
                                                        </span>
                                                        <span className="hidden whitespace-nowrap text-white md:inline">{item.title}</span>
                                                        {item.isPinned && typeof pinnedIndex === 'number' && pinnedIndex > -1 && (
                                                                <span className="sr-only"> pinned app</span>
                                                        )}
                                                </button>
                                        </li>
                                );
                        })}
                </ul>
        );
};

export default Taskbar;
