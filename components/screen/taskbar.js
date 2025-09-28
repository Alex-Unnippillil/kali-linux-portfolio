import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { safeLocalStorage } from '../../utils/safeStorage';

const PINNED_STORAGE_KEY = 'kali-pinned';
const PINNED_ORDER_STORAGE_KEY = 'kali-pinned-order';

const parsePinnedIds = (rawValue) => {
    if (!rawValue) return [];

    try {
        const parsed = JSON.parse(rawValue);

        if (Array.isArray(parsed)) {
            return parsed.filter(value => typeof value === 'string');
        }

        if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.ids)) {
                return parsed.ids.filter(value => typeof value === 'string');
            }

            if (Array.isArray(parsed.order)) {
                return parsed.order.filter(value => typeof value === 'string');
            }

            if (Array.isArray(parsed.list)) {
                return parsed.list.filter(value => typeof value === 'string');
            }

            if (parsed.items && Array.isArray(parsed.items)) {
                return parsed.items.filter(value => typeof value === 'string');
            }

            if (parsed.apps && Array.isArray(parsed.apps)) {
                return parsed.apps.filter(value => typeof value === 'string');
            }

            if (parsed.byId && typeof parsed.byId === 'object') {
                return Object.keys(parsed.byId).filter(value => typeof value === 'string');
            }

            return Object.keys(parsed).filter(value => typeof value === 'string');
        }
    } catch (error) {
        return [];
    }

    return [];
};

const mergeWithStoredOrder = (ids, orderValue) => {
    if (!orderValue) return ids;

    try {
        const parsed = JSON.parse(orderValue);
        if (!Array.isArray(parsed)) return ids;

        const normalizedOrder = parsed.filter(value => typeof value === 'string');
        if (normalizedOrder.length === 0) return ids;

        const idSet = new Set(ids);
        const ordered = normalizedOrder.filter(id => idSet.has(id));
        const orderSet = new Set(ordered);
        const remainder = ids.filter(id => !orderSet.has(id));

        return [...ordered, ...remainder];
    } catch (error) {
        return ids;
    }
};

export default function Taskbar(props) {
    const [pinnedIds, setPinnedIds] = useState([]);

    const readPinnedFromStorage = useCallback(() => {
        if (!safeLocalStorage) return [];

        const rawPinned = safeLocalStorage.getItem(PINNED_STORAGE_KEY);
        const ids = parsePinnedIds(rawPinned);

        const rawOrder = safeLocalStorage.getItem(PINNED_ORDER_STORAGE_KEY);
        const orderedIds = mergeWithStoredOrder(ids, rawOrder);

        const deduped = [];
        const seen = new Set();

        orderedIds.forEach(id => {
            if (typeof id !== 'string') return;
            if (seen.has(id)) return;
            seen.add(id);
            deduped.push(id);
        });

        return deduped;
    }, []);

    useEffect(() => {
        setPinnedIds(readPinnedFromStorage());
    }, [readPinnedFromStorage]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleStorage = (event) => {
            if (!event || !event.key) {
                setPinnedIds(readPinnedFromStorage());
                return;
            }

            if (event.key === PINNED_STORAGE_KEY || event.key === PINNED_ORDER_STORAGE_KEY) {
                setPinnedIds(readPinnedFromStorage());
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [readPinnedFromStorage]);

    const appsById = useMemo(() => {
        const mapping = new Map();
        props.apps.forEach(app => {
            if (app && app.id) {
                mapping.set(app.id, app);
            }
        });
        return mapping;
    }, [props.apps]);

    const pinnedApps = useMemo(() => (
        pinnedIds
            .map(id => appsById.get(id))
            .filter(Boolean)
    ), [appsById, pinnedIds]);

    const pinnedSet = useMemo(() => new Set(pinnedApps.map(app => app.id)), [pinnedApps]);

    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false && !pinnedSet.has(app.id));
    const workspaces = props.workspaces || [];

    const handleClick = (app) => {
        const id = app.id;
        if (props.closed_windows[id]) {
            props.openApp(id);
            return;
        }

        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    };

    const renderTaskbarButton = (app) => {
        const isRunning = props.closed_windows[app.id] === false;
        const isMinimized = isRunning && Boolean(props.minimized_windows[app.id]);
        const isFocused = isRunning && Boolean(props.focused_windows[app.id]);
        const isActive = isRunning && !isMinimized;

        return (
            <button
                key={app.id}
                type="button"
                aria-label={app.title}
                data-context="taskbar"
                data-app-id={app.id}
                data-active={isActive ? 'true' : 'false'}
                aria-pressed={isActive}
                onClick={() => handleClick(app)}
                className={`${isFocused && isActive ? 'bg-white bg-opacity-20 ' : ''}relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10`}
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
                {isActive && (
                    <span
                        aria-hidden="true"
                        data-testid="running-indicator"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded"
                    />
                )}
            </button>
        );
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center justify-between px-2 z-40" role="toolbar">
            <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={props.activeWorkspace}
                onSelect={props.onSelectWorkspace}
            />
            <div className="flex items-center overflow-x-auto">
                {pinnedApps.map(renderTaskbarButton)}
                {runningApps.map(renderTaskbarButton)}
            </div>
        </div>
    );
}
