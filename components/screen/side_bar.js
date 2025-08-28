import React, { useState } from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';

export default function SideBar(props) {

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    const handleDragStart = (id) => (e) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (id) => (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === id) return;
        const order = [...props.pinnedOrder];
        const from = order.indexOf(draggedId);
        const to = order.indexOf(id);
        if (from === -1 || to === -1) return;
        order.splice(from, 1);
        order.splice(to, 0, draggedId);
        props.setPinnedOrder(order);
    };

    const openUnpinned = props.apps
        .filter(app => props.favourite_apps[app.id] && !props.pinnedOrder.includes(app.id))
        .map(app => app.id);

    const appsInOrder = [...props.pinnedOrder, ...openUnpinned];

    return (
        <>
            <div className={(props.hide ? " -translate-x-full " : "") + " absolute transform duration-300 select-none z-40 left-0 top-0 h-full pt-7 w-auto flex flex-col justify-start items-center border-black border-opacity-60 bg-black bg-opacity-50"}>
                {appsInOrder.map(id => {
                    const app = props.apps.find(a => a.id === id);
                    if (!app) return null;
                    const draggable = props.pinnedOrder.includes(id);
                    return (
                        <SideBarApp
                            key={id}
                            id={id}
                            title={app.title}
                            icon={app.icon}
                            isClose={props.closed_windows}
                            isFocus={props.focused_windows}
                            openApp={props.openAppByAppId}
                            isMinimized={props.isMinimized}
                            draggable={draggable}
                            onDragStart={draggable ? handleDragStart(id) : undefined}
                            onDragOver={draggable ? handleDragOver : undefined}
                            onDrop={draggable ? handleDrop(id) : undefined}
                        />
                    );
                })}
                <AllApps showApps={props.showAllApps} />
            </div>
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className={"w-1 h-full absolute top-0 left-0 bg-transparent z-50"}></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <div
            className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center`}
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