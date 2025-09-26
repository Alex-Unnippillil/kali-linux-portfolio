import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { safeLocalStorage } from '../../utils/safeStorage';

const PINNED_STORAGE_KEY = 'kali-pinned';
const PINNED_ORDER_KEYS = ['kali-pinned-order', 'kali-pinned-ordering'];

const arraysEqual = (a = [], b = []) => (
    a.length === b.length && a.every((value, index) => value === b[index])
);

const parseJsonArray = (value) => {
    if (!value) return undefined;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
    } catch (error) {
        return undefined;
    }
};

const normalizePinnedIds = (value) => {
    if (!value) return [];

    const ids = new Set();

    const addId = (id) => {
        if (typeof id === 'string') {
            ids.add(id);
        }
    };

    const addFromArray = (arr) => {
        if (Array.isArray(arr)) {
            arr.forEach(addId);
        }
    };

    const addFromObject = (obj) => {
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.entries(obj).forEach(([id, flag]) => {
                if (flag === true || flag === 'true' || flag === 1) {
                    addId(id);
                }
            });
        }
    };

    if (Array.isArray(value)) {
        addFromArray(value);
    } else if (value && typeof value === 'object') {
        addFromArray(value.order);
        addFromArray(value.ordered);
        addFromArray(value.ids);
        addFromArray(value.items);
        addFromArray(value.list);

        addFromObject(value.items);
        addFromObject(value.apps);
        addFromObject(value.entries);
        addFromObject(value.pinned);
        addFromObject(value.map);

        Object.entries(value).forEach(([key, flag]) => {
            if (flag === true || flag === 'true' || flag === 1) {
                addId(key);
            }
        });
    }

    return Array.from(ids);
};

export default function Taskbar(props) {
    const [pinnedIds, setPinnedIds] = useState([]);

    const appMap = useMemo(() => {
        const map = new Map();
        props.apps.forEach(app => {
            map.set(app.id, app);
        });
        return map;
    }, [props.apps]);

    useEffect(() => {
        if (!safeLocalStorage) return undefined;

        const readPinnedIds = () => {
            let parsedPinned;

            const pinnedValue = safeLocalStorage.getItem(PINNED_STORAGE_KEY);
            if (pinnedValue) {
                try {
                    parsedPinned = JSON.parse(pinnedValue);
                } catch (error) {
                    parsedPinned = undefined;
                }
            }

            const normalized = normalizePinnedIds(parsedPinned);
            const pinnedSet = new Set(normalized);

            if (pinnedSet.size === 0) {
                setPinnedIds(prev => (prev.length ? [] : prev));
                return;
            }

            const explicitOrders = [];

            if (parsedPinned && typeof parsedPinned === 'object') {
                const inlineOrder = Array.isArray(parsedPinned.order)
                    ? parsedPinned.order
                    : Array.isArray(parsedPinned.ordered)
                        ? parsedPinned.ordered
                        : undefined;

                if (Array.isArray(inlineOrder)) {
                    explicitOrders.push(inlineOrder.filter(id => typeof id === 'string'));
                }
            }

            PINNED_ORDER_KEYS.forEach(key => {
                const order = parseJsonArray(safeLocalStorage.getItem(key));
                if (order) explicitOrders.push(order);
            });

            const orderedIds = [];

            explicitOrders.forEach(order => {
                order.forEach(id => {
                    if (pinnedSet.has(id) && !orderedIds.includes(id)) {
                        orderedIds.push(id);
                    }
                });
            });

            normalized.forEach(id => {
                if (pinnedSet.has(id) && !orderedIds.includes(id)) {
                    orderedIds.push(id);
                }
            });

            const filtered = orderedIds.filter(id => appMap.has(id));

            setPinnedIds(prev => (arraysEqual(prev, filtered) ? prev : filtered));
        };

        readPinnedIds();

        const handleStorage = (event) => {
            if (!event || event.key === null) {
                readPinnedIds();
                return;
            }

            if (event.key === PINNED_STORAGE_KEY || PINNED_ORDER_KEYS.includes(event.key)) {
                readPinnedIds();
            }
        };

        const handleCustomEvent = () => {
            readPinnedIds();
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('kali-pinned:update', handleCustomEvent);
        window.addEventListener('kali-pinned-update', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('kali-pinned:update', handleCustomEvent);
            window.removeEventListener('kali-pinned-update', handleCustomEvent);
        };
    }, [appMap]);

    const pinnedApps = useMemo(() => (
        pinnedIds
            .map(id => appMap.get(id))
            .filter(Boolean)
    ), [appMap, pinnedIds]);

    const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const runningUnpinnedApps = runningApps.filter(app => !pinnedSet.has(app.id));

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

    const renderAppButton = (app) => (
        <button
            key={`dock-${app.id}`}
            type="button"
            aria-label={app.title}
            data-context="taskbar"
            data-app-id={app.id}
            onClick={() => handleClick(app)}
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
            {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && props.closed_windows[app.id] === false && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
            )}
        </button>
    );

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {pinnedApps.map(renderAppButton)}
            {runningUnpinnedApps.map(renderAppButton)}
        </div>
    );
}
