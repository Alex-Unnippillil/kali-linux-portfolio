import React, { useCallback, useState } from 'react'
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

    const handleKeyNavigation = useCallback((event) => {
        const { key, currentTarget } = event;
        const nav = currentTarget.closest('[data-sidebar-nav="true"]');
        if (!nav) return;

        const items = Array.from(nav.querySelectorAll('[data-sidebar-item="true"]'));
        if (items.length === 0) return;

        const index = items.indexOf(currentTarget);
        if (index === -1) return;

        const focusItem = (nextIndex) => {
            const clampedIndex = (nextIndex + items.length) % items.length;
            const next = items[clampedIndex];
            if (next) {
                event.preventDefault();
                next.focus();
            }
        };

        switch (key) {
            case 'ArrowDown':
            case 'ArrowRight':
                focusItem(index + 1);
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                focusItem(index - 1);
                break;
            case 'Home':
                focusItem(0);
                break;
            case 'End':
                focusItem(items.length - 1);
                break;
            default:
                break;
        }
    }, []);

    return (
        <>
            <nav
                aria-label="Dock"
                className={(props.hide ? " -translate-x-full " : "") +
                    " absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50"}
                data-sidebar-nav="true"
            >
                {
                    (
                        Object.keys(props.closed_windows).length !== 0
                            ? renderApps(props)
                            : null
                    )
                }
                <AllApps showApps={props.showAllApps} onNavigate={handleKeyNavigation} />
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
            className={`w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active`}
            style={{ marginTop: 'auto' }}
            aria-label="Show Applications"
            data-sidebar-item="true"
            onMouseEnter={() => {
                setTitle(true);
            }}
            onMouseLeave={() => {
                setTitle(false);
            }}
            onClick={props.showApps}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    props.showApps();
                    return;
                }
                if (props.onNavigate) {
                    props.onNavigate(event);
                }
            }}
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
