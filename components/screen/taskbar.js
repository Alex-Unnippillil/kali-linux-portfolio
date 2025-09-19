import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { safeLocalStorage } from '../../utils/safeStorage';
import RecentPopover from './taskbar/RecentPopover';

const formatIcon = (icon) => icon ? icon.replace('./', '/') : '/themes/Yaru/system/view-app-grid-symbolic.svg';

export default function Taskbar(props) {
    const {
        apps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
        pinned = [],
        recentItems = [],
        onPin,
        onUnpin,
        recentRequestKey = 0,
    } = props;

    const appMap = useMemo(() => {
        const map = new Map();
        apps.forEach(app => {
            map.set(app.id, app);
        });
        return map;
    }, [apps]);

    const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

    const pinnedApps = useMemo(
        () => pinned.map(id => appMap.get(id)).filter(Boolean),
        [pinned, appMap]
    );

    const runningApps = useMemo(
        () => apps.filter(app => closed_windows[app.id] === false && !pinnedSet.has(app.id)),
        [apps, closed_windows, pinnedSet]
    );

    const taskbarApps = useMemo(
        () => [...pinnedApps, ...runningApps],
        [pinnedApps, runningApps]
    );

    const recents = useMemo(() => {
        const items = recentItems
            .filter(item => item && item.id && !pinnedSet.has(item.id))
            .map(item => {
                const meta = appMap.get(item.id) || {};
                return {
                    ...item,
                    title: item.title || meta.title || item.id,
                    icon: formatIcon(item.icon || meta.icon),
                };
            });
        items.sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
        return items;
    }, [recentItems, pinnedSet, appMap]);

    useEffect(() => {
        if (!Array.isArray(pinned)) return;
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinned));
    }, [pinned]);

    const recentsButtonRef = useRef(null);
    const popoverContainerRef = useRef(null);
    const lastRequestKey = useRef(recentRequestKey);
    const [recentVisible, setRecentVisible] = useState(false);
    const [manualRecent, setManualRecent] = useState(false);

    const showManualRecent = () => {
        setRecentVisible(true);
        setManualRecent(true);
        setTimeout(() => {
            recentsButtonRef.current?.focus();
        }, 0);
    };

    useEffect(() => {
        if (recentRequestKey === 0) {
            lastRequestKey.current = recentRequestKey;
            return;
        }
        if (recentRequestKey !== lastRequestKey.current) {
            lastRequestKey.current = recentRequestKey;
            showManualRecent();
        }
    }, [recentRequestKey]);

    useEffect(() => {
        if (!recentVisible) return;
        const handlePointer = (event) => {
            const container = popoverContainerRef.current;
            const button = recentsButtonRef.current;
            if (!container || !button) return;
            if (container.contains(event.target) || button.contains(event.target)) return;
            setRecentVisible(false);
            setManualRecent(false);
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('touchstart', handlePointer);
        const handleFocus = (event) => {
            const container = popoverContainerRef.current;
            const button = recentsButtonRef.current;
            if (!container || !button) return;
            if (container.contains(event.target) || button.contains(event.target)) return;
            setRecentVisible(false);
            setManualRecent(false);
        };
        document.addEventListener('focusin', handleFocus);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
            document.removeEventListener('focusin', handleFocus);
        };
    }, [recentVisible]);

    const handleRecentMouseEnter = () => {
        setRecentVisible(true);
        setManualRecent(false);
    };

    const handleRecentMouseLeave = () => {
        if (manualRecent) return;
        setRecentVisible(false);
    };

    const handleRecentFocus = () => {
        showManualRecent();
    };

    const handleRecentClose = () => {
        setRecentVisible(false);
        setManualRecent(false);
        recentsButtonRef.current?.focus();
    };

    const handleRecentSelect = (id) => {
        openApp(id);
        handleRecentClose();
    };

    const handleClick = (app) => {
        const id = app.id;
        const isOpen = closed_windows[id] === false;
        if (!isOpen) {
            openApp(id);
            return;
        }
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 px-2 relative"
            role="toolbar"
        >
            {taskbarApps.map(app => {
                const id = app.id;
                const isOpen = closed_windows[id] === false;
                const isFocused = focused_windows[id] && !minimized_windows[id];
                const isMinimized = minimized_windows[id];
                const isPinned = pinnedSet.has(id);
                const handleTaskbarKeyDown = (event) => {
                    if ((event.key === 'p' || event.key === 'P') && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        if (isPinned) {
                            onUnpin && onUnpin(id);
                        } else {
                            onPin && onPin(id);
                        }
                    }
                };
                return (
                    <button
                        key={id}
                        type="button"
                        aria-label={app.title}
                        title={`${app.title}${isPinned ? ' (Pinned)' : ''}`}
                        data-context="taskbar"
                        data-app-id={id}
                        onClick={() => handleClick(app)}
                        onKeyDown={handleTaskbarKeyDown}
                        className={
                            (isFocused ? ' bg-white bg-opacity-20 ' : ' ') +
                            'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-70'
                        }
                    >
                        <Image
                            width={24}
                            height={24}
                            className="w-5 h-5"
                            src={formatIcon(app.icon)}
                            alt=""
                            sizes="24px"
                        />
                        <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                        {isOpen && !isFocused && !isMinimized && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                        )}
                    </button>
                );
            })}

            <div
                ref={popoverContainerRef}
                onMouseEnter={handleRecentMouseEnter}
                onMouseLeave={handleRecentMouseLeave}
                className="ml-auto relative"
            >
                <button
                    type="button"
                    ref={recentsButtonRef}
                    className="flex items-center px-3 py-1 rounded text-sm text-white hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-70"
                    aria-haspopup="true"
                    aria-expanded={recentVisible}
                    onFocus={handleRecentFocus}
                >
                    Recent
                </button>
                <RecentPopover
                    anchorRef={recentsButtonRef}
                    items={recents}
                    visible={recentVisible}
                    onSelect={handleRecentSelect}
                    onClose={handleRecentClose}
                />
            </div>
        </div>
    );
}
