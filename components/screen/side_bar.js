import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import SideBarApp from '../base/side_bar_app';
import usePersistentState from '../../hooks/usePersistentState';

const PANEL_PREFIX = 'xfce.panel.';

export default function SideBar(props) {

    const [editMode, setEditMode] = useState(false);
    const [dragId, setDragId] = useState(null);
    const [order, setOrder] = usePersistentState(`${PANEL_PREFIX}order`, []);
    const [locked, setLocked] = usePersistentState(`${PANEL_PREFIX}locked`, true);

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    const favourites = props.apps.filter(app => props.favourite_apps[app.id]);

    useEffect(() => {
        setOrder(prev => {
            const ids = favourites.map(a => a.id);
            const newOrder = prev.filter(id => ids.includes(id));
            ids.forEach(id => { if (!newOrder.includes(id)) newOrder.push(id); });
            return newOrder;
        });
    }, [favourites, setOrder]);

    const getIndex = (id) => {
        const i = order.indexOf(id);
        return i === -1 ? order.length : i;
    };
    const orderedApps = favourites.sort((a, b) => getIndex(a.id) - getIndex(b.id));

    const handleDragStart = (id) => {
        setDragId(id);
    };

    const handleDrop = (id) => {
        if (dragId === null || dragId === id) return;
        setOrder(prev => {
            const newOrder = [...prev];
            const from = newOrder.indexOf(dragId);
            const to = newOrder.indexOf(id);
            if (from === -1 || to === -1) return prev;
            newOrder.splice(to, 0, newOrder.splice(from, 1)[0]);
            return newOrder;
        });
    };

    return (
        <>
            <nav
                aria-label="Dock"
                className={(props.hide ? " -translate-x-full " : "") +
                    " absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50"}
            >
                {orderedApps.map(app => (
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
                        draggable={editMode && !locked}
                        editMode={editMode && !locked}
                        onDragStart={() => handleDragStart(app.id)}
                        onDragOver={(e) => { if (editMode && !locked) e.preventDefault(); }}
                        onDrop={() => handleDrop(app.id)}
                    />
                ))}
                <div className="mt-auto flex flex-col items-center">
                    {!locked && (
                        <button
                            type="button"
                            aria-label={editMode ? 'Exit Edit Mode' : 'Edit Panel'}
                            onClick={() => setEditMode(!editMode)}
                            className="w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center"
                        >
                            {editMode ? '✔️' : '✏️'}
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label={locked ? 'Unlock Panel' : 'Lock Panel'}
                        onClick={() => { setLocked(!locked); if (!locked) setEditMode(false); }}
                        className="w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center"
                    >
                        {locked ? '🔓' : '🔒'}
                    </button>
                    <AllApps showApps={props.showAllApps} />
                </div>
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