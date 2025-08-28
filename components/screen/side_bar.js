import React, { useState } from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';

export default function SideBar(props) {

    const [focusIndex, setFocusIndex] = useState(0);
    const itemIds = [];

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    const handleKeyDown = (e, index) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const total = itemIds.length;
        let next = index;
        if (e.key === 'ArrowDown') {
            next = (index + 1) % total;
        } else if (e.key === 'ArrowUp') {
            next = (index - 1 + total) % total;
        }
        setFocusIndex(next);
        const el = document.getElementById(itemIds[next]);
        if (el) el.focus();
    };

    const appsJsx = [];
    props.apps.forEach((app) => {
        if (props.favourite_apps[app.id] === false) return;
        const current = itemIds.length;
        const id = `sidebar-${app.id}`;
        itemIds.push(id);
        appsJsx.push(
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
                tabIndex={focusIndex === current ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, current)}
            />
        );
    });

    const allAppsIndex = itemIds.length;
    itemIds.push('sidebar-all-apps');

    return (
        <>
            <div className={(props.hide ? " -translate-x-full " : "") + " absolute transform duration-300 select-none z-40 left-0 top-0 h-full pt-7 w-auto flex flex-col justify-start items-center border-black border-opacity-60 bg-black bg-opacity-50"}>
                {Object.keys(props.closed_windows).length !== 0 ? appsJsx : null}
                <AllApps
                    id="sidebar-all-apps"
                    showApps={props.showAllApps}
                    tabIndex={focusIndex === allAppsIndex ? 0 : -1}
                    onKeyDown={(e) => handleKeyDown(e, allAppsIndex)}
                />
            </div>
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className={"w-1 h-full absolute top-0 left-0 bg-transparent z-50"}></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <button
            type="button"
            id={props.id}
            aria-label="Show Applications"
            tabIndex={props.tabIndex}
            onKeyDown={props.onKeyDown}
            className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 focus:bg-white focus:bg-opacity-10 focus:outline focus:outline-2 focus:outline-white flex items-center justify-center`}
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
        </button>
    );
}