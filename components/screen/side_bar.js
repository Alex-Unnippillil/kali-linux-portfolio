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
                className={`${props.hide ? '-translate-x-full' : ''} glass accent-border absolute left-0 top-0 z-40 flex h-full min-h-screen w-14 transform select-none flex-col items-center justify-start gap-2 pt-5 pb-6 transition-transform duration-300 border-r`}
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
            <div onMouseEnter={showSideBar} onMouseLeave={hideSideBar} className={"w-1 h-full absolute top-0 left-0 bg-transparent z-50"}></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);

    return (
        <div
            className={`w-9 h-9 rounded-lg my-1.5 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active`}
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
                    src="/themes/Kali/categories/applications-all.svg"
                    alt="Kali view app"
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