import React, { useState } from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';

let renderApps = (props) => {
    let sideBarAppsJsx = [];
    props.apps.forEach((app, index) => {
        if (props.favourite_apps[app.id] === false) return;
        sideBarAppsJsx.push(
            <SideBarApp key={app.id} id={app.id} title={app.title} icon={app.icon} isClose={props.closed_windows} isFocus={props.focused_windows} openApp={props.openAppByAppId} isMinimized={props.isMinimized} openFromMinimised={props.openFromMinimised} />
        );
    });
    return sideBarAppsJsx;
}

export default function SideBar(props) {

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    return (
        <>
            <nav
                aria-label="Dock"
                className={`${props.hide ? '-translate-x-full' : ''} desktop-dock absolute left-0 top-0 z-40 flex h-full min-h-screen w-16 transform flex-col items-center justify-start overflow-visible rounded-r-3xl pt-6 transition duration-300`}
            >
                {
                    (
                        Object.keys(props.closed_windows).length !== 0
                            ? renderApps(props)
                            : null
                    )
                }
                <AllApps showApps={props.showAllApps} />
            </nav>
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className="absolute left-0 top-0 z-50 h-full w-1 bg-transparent"></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <button
            type="button"
            className={`dock-button m-1 text-ubt-grey/85 ${title ? 'ring-1 ring-ubb-orange/60' : ''}`}
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
                    className="w-7 drop-shadow-[0_0_12px_rgba(23,147,209,0.45)]"
                    src="/themes/Yaru/system/view-app-grid-symbolic.svg"
                    alt="Show applications"
                    sizes="28px"
                />
                <div
                    className={`${title ? 'visible' : 'invisible'} pointer-events-none absolute top-1 left-full ml-4 whitespace-nowrap rounded-lg border border-white/10 bg-ub-grey/90 px-2 py-1 text-xs text-ubt-grey shadow-lg backdrop-blur`}
                >
                    Show Applications
                </div>
            </div>
        </button>
    );
}
