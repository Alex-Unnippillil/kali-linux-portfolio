import React, { useState } from 'react'
import SideBarApp from '../base/side_bar_app';
import { Icon } from '../ui/Icon';

export default function SideBar(props) {

    const [dragging, setDragging] = useState(null);

    const showSideBar = () => {
        props.hideSideBar(null, false);
    };

    const hideSideBar = () => {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    };

    const handleDragStart = (e, id) => {
        setDragging(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragging === null || dragging === id) return;
        const dock = [...props.dock];
        const from = dock.indexOf(dragging);
        const to = dock.indexOf(id);
        if (from === -1 || to === -1) return;
        dock.splice(from, 1);
        dock.splice(to, 0, dragging);
        props.reorderDock && props.reorderDock(dock);
        setDragging(null);
    };

    const handleNavDrop = (e) => {
        e.preventDefault();
        if (dragging === null) return;
        const dock = props.dock.filter(id => id !== dragging);
        dock.push(dragging);
        props.reorderDock && props.reorderDock(dock);
        setDragging(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const openUnpinned = props.apps
        .filter(app => props.closed_windows[app.id] === false && !props.dock.includes(app.id))
        .map(app => app.id);

    const order = [...props.dock, ...openUnpinned];

    return (
        <>
            <nav
                aria-label="Dock"
                className={(props.hide ? " -translate-x-full " : "") +
                    " absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen flex flex-col justify-start items-center pt-7 border-black border-opacity-60"}
                style={{
                    width: 'var(--sidebar-width)',
                    backgroundColor: 'var(--menu-bg)',
                    opacity: 'var(--menu-opacity)',
                    borderRadius: 'var(--menu-border-radius)'
                }}
                onDragOver={handleDragOver}
                onDrop={handleNavDrop}
            >
                {order.map(id => {
                    const app = props.apps.find(a => a.id === id);
                    if (!app) return null;
                    const pinned = props.dock.includes(id);
                    return (
                        <div
                            key={id}
                            draggable={pinned}
                            onDragStart={pinned ? (e) => handleDragStart(e, id) : undefined}
                            onDragEnd={() => setDragging(null)}
                            onDrop={pinned ? (e) => handleDrop(e, id) : undefined}
                            onDragOver={pinned ? handleDragOver : undefined}
                        >
                            <SideBarApp
                                id={app.id}
                                title={app.title}
                                icon={app.icon}
                                isClose={props.closed_windows}
                                isFocus={props.focused_windows}
                                openApp={props.openAppByAppId}
                                isMinimized={props.isMinimized}
                                openFromMinimised={props.openFromMinimised}
                                notifications={app.notifications}
                                tasks={app.tasks}
                            />
                        </div>
                    );
                })}
                <AllApps showApps={props.showAllApps} />
            </nav>
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className={"w-1 h-full absolute top-0 left-0 bg-transparent z-50"}></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <button
            type="button"
            aria-label="Show Applications"
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
                <Icon name="grid" className="w-7 h-7" />
                <div
                    className={
                        (title ? " visible " : " invisible ") +
                        " w-max py-0.5 px-1.5 absolute top-1 left-full ml-5 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"
                    }
                >
                    Show Applications
                </div>
            </div>
        </button>
    );
}