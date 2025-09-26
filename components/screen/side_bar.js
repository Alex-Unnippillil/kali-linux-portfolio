import React, { useState } from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';
import usePanelPosition from '../../hooks/usePanelPosition';

let renderApps = (props, position) => {
    let sideBarAppsJsx = [];
    props.apps.forEach((app, index) => {
        if (props.favourite_apps[app.id] === false) return;
        sideBarAppsJsx.push(
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
                position={position}
            />
        );
    });
    return sideBarAppsJsx;
}

export default function SideBar(props) {

    const [position] = usePanelPosition();
    const isBottom = position === 'bottom';

    function showSideBar() {
        props.hideSideBar(null, false);
    }

    function hideSideBar() {
        setTimeout(() => {
            props.hideSideBar(null, true);
        }, 2000);
    }

    const navBaseClasses = "absolute transform duration-300 select-none z-40 border-black border-opacity-60 bg-black bg-opacity-50 flex";
    const navOrientationClasses = isBottom
        ? " left-1/2 -translate-x-1/2 bottom-12 h-16 px-2 py-2 rounded-t-xl shadow-lg flex-row items-center gap-1"
        : " left-0 top-0 h-full min-h-screen w-16 flex-col justify-start items-center pt-7";
    const navVisibilityClass = props.hide
        ? (isBottom ? " translate-y-full" : " -translate-x-full")
        : (isBottom ? " translate-y-0" : "");

    return (
        <>
            <nav
                aria-label="Dock"
                className={navBaseClasses + navOrientationClasses + navVisibilityClass}
            >
                {
                    (
                        Object.keys(props.closed_windows).length !== 0
                            ? renderApps(props, position)
                            : null
                    )
                }
                <AllApps showApps={props.showAllApps} position={position} />
            </nav>
            <div
                onMouseEnter={showSideBar}
                onMouseLeave={hideSideBar}
                className={(isBottom
                    ? "h-2 w-full bottom-12"
                    : "w-1 h-full top-0") + " absolute left-0 bg-transparent z-50"}
            ></div>
        </>
    )
}

export function AllApps(props) {

    const [title, setTitle] = useState(false);
    const isBottom = props.position === 'bottom';

    return (
        <div
            className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active ${isBottom ? 'ml-auto' : 'mt-auto'}`}
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
                        (isBottom
                            ? " w-max py-0.5 px-1.5 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"
                            : " w-max py-0.5 px-1.5 absolute top-1 left-full ml-5 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md")
                    }
                >
                    Show Applications
                </div>
            </div>
        </div>
    );
}