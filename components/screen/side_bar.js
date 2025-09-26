import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';
import { safeLocalStorage } from '../../utils/safeStorage';

const PINNED_ORDER_KEY = 'kali-pinned-order';

const arraysEqual = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export default function SideBar(props) {

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    const pinnedIds = useMemo(() => (
        props.apps
            .filter((app) => props.favourite_apps[app.id])
            .map((app) => app.id)
    ), [props.apps, props.favourite_apps]);

    const [pinnedOrder, setPinnedOrder] = useState(() => pinnedIds);

    const persistOrder = useCallback((order) => {
        if (!safeLocalStorage) return;
        try {
            safeLocalStorage.setItem(PINNED_ORDER_KEY, JSON.stringify(order));
        } catch (e) {
            // ignore storage errors (quota, etc.)
        }
    }, []);

    const orderedPinnedIds = useMemo(() => {
        const filtered = pinnedOrder.filter((id) => pinnedIds.includes(id));
        const missing = pinnedIds.filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
    }, [pinnedIds, pinnedOrder]);

    useEffect(() => {
        if (!safeLocalStorage) return;
        let stored = [];
        try {
            stored = JSON.parse(safeLocalStorage.getItem(PINNED_ORDER_KEY) || '[]');
        } catch (e) {
            stored = [];
        }
        const validStored = stored.filter((id) => pinnedIds.includes(id));
        const missing = pinnedIds.filter((id) => !validStored.includes(id));
        const nextOrder = [...validStored, ...missing];
        if (!arraysEqual(pinnedOrder, nextOrder)) {
            setPinnedOrder(nextOrder);
        }
        if (!arraysEqual(stored, nextOrder)) {
            persistOrder(nextOrder);
        }
    }, [pinnedIds, pinnedOrder, persistOrder]);

    const updatePinnedOrder = useCallback((draggedId, targetId = null) => {
        if (!draggedId || draggedId === targetId) return;
        setPinnedOrder((prev) => {
            if (!prev.includes(draggedId)) return prev;
            const withoutDragged = prev.filter((id) => id !== draggedId);
            let nextOrder;
            if (targetId && withoutDragged.includes(targetId)) {
                const targetIndex = withoutDragged.indexOf(targetId);
                nextOrder = [
                    ...withoutDragged.slice(0, targetIndex),
                    draggedId,
                    ...withoutDragged.slice(targetIndex),
                ];
            } else {
                nextOrder = [...withoutDragged, draggedId];
            }
            if (arraysEqual(prev, nextOrder)) return prev;
            persistOrder(nextOrder);
            return nextOrder;
        });
    }, [persistOrder]);

    const handleDragStart = useCallback((event, id) => {
        if (!event?.dataTransfer) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
    }, []);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        if (event?.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }, []);

    const handleDrop = useCallback((event, targetId = null) => {
        event.preventDefault();
        event.stopPropagation();
        const draggedId = event?.dataTransfer?.getData('text/plain');
        if (!draggedId) return;
        updatePinnedOrder(draggedId, targetId);
        event?.dataTransfer?.clearData();
    }, [updatePinnedOrder]);

    const appMap = useMemo(() => {
        const map = new Map();
        props.apps.forEach((app) => {
            map.set(app.id, app);
        });
        return map;
    }, [props.apps]);

    return (
        <>
            <nav
                aria-label="Dock"
                className={(props.hide ? " -translate-x-full " : "") +
                    " absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50"}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {
                    Object.keys(props.closed_windows).length !== 0
                        ? orderedPinnedIds.map((appId) => {
                            if (!props.favourite_apps[appId]) return null;
                            const app = appMap.get(appId);
                            if (!app) return null;
                            return (
                                <SideBarApp
                                    key={app.id}
                                    id={app.id}
                                    title={app.title}
                                    icon={app.icon}
                                    isClose={props.closed_windows}
                                    isFocus={props.focused_windows}
                                    openApp={props.openAppByAppId}
                                    isMinimized={props.isMinimized}
                                    openFromMinimised={props.openFromMinimised}
                                    draggable
                                    onDragStart={(event) => handleDragStart(event, app.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(event) => handleDrop(event, app.id)}
                                />
                            );
                        })
                        : null
                }
                <AllApps showApps={props.showAllApps} />
            </nav>
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className={"w-1 h-full absolute top-0 left-0 bg-transparent z-50"}></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <div
            className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active`}
            style={{ marginTop: 'auto' }}
            onMouseEnter={() => {
                setTitle(true);
            }}
            onMouseLeave={() => {
                setTitle(false);
            }}
            onClick={props.showApps}
        >
            <div className="relative">
                <Image
                    width={28}
                    height={28}
                    className="w-7"
                    src="/themes/Yaru/system/view-app-grid-symbolic.svg"
                    alt="Ubuntu view app"
                    sizes="28px"
                />
                <div
                    className={
                        (title ? " visible " : " invisible ") +
                        " w-max py-0.5 px-1.5 absolute top-1 left-full ml-5 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"
                    }
                >
                    Show Applications
                </div>
            </div>
        </div>
    );
}