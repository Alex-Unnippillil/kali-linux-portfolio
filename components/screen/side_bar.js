import React from 'react'
import Image from 'next/image'
import SideBarApp from '../base/side_bar_app';
import { Tooltip } from '../ui/TooltipProvider';

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
                className={(props.hide ? " -translate-x-full " : "") +
                    " absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50"}
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
    return (
        <Tooltip content="Show Applications" placement={["right", "left", "top"]}>
            <button
                type="button"
                aria-label="Show Applications"
                className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active`}
                style={{ marginTop: 'auto' }}
                onClick={props.showApps}
            >
                <Image
                    width={28}
                    height={28}
                    className="w-7"
                    src="/themes/Yaru/system/view-app-grid-symbolic.svg"
                    alt="Ubuntu view app"
                    sizes="28px"
                />
            </button>
        </Tooltip>
    );
}