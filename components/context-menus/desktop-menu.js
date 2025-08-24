import React, { useState, useEffect } from 'react'

const MENU_LABELS = {
    newFolder: 'New Folder',
    paste: 'Paste',
    showDesktop: 'Show Desktop in Files',
    openTerminal: 'Open in Terminal',
    changeBackground: 'Change Background...',
    displaySettings: 'Display Settings',
    settings: 'Settings',
    enterFullScreen: 'Enter Full Screen',
    exitFullScreen: 'Exit Full Screen',
}

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)

    useEffect(() => {
        document.addEventListener('fullscreenchange', checkFullScreen);
        return () => {
            document.removeEventListener('fullscreenchange', checkFullScreen);
        };
    }, [])


    const openTerminal = () => {
        props.openApp("terminal");
    }

    const openSettings = () => {
        props.openApp("settings");
    }

    const checkFullScreen = () => {
        if (document.fullscreenElement) {
            setIsFullScreen(true)
        } else {
            setIsFullScreen(false)
        }
    }

    const goFullScreen = () => {
        // make website full screen
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                document.documentElement.requestFullscreen()
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            className={
                (props.active ? "block pointer-events-auto " : "hidden pointer-events-none ") +
                "cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-menu text-sm"
            }
        >
            <div
                onClick={props.addNewFolder}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && props.addNewFolder()}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">{MENU_LABELS.newFolder}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                tabIndex={-1}
                aria-disabled="true"
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{MENU_LABELS.paste}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                tabIndex={-1}
                aria-disabled="true"
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{MENU_LABELS.showDesktop}</span>
            </div>
            <div
                onClick={openTerminal}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openTerminal()}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">{MENU_LABELS.openTerminal}</span>
            </div>
            <Devider />
            <div
                onClick={openSettings}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openSettings()}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">{MENU_LABELS.changeBackground}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                tabIndex={-1}
                aria-disabled="true"
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{MENU_LABELS.displaySettings}</span>
            </div>
            <div
                onClick={openSettings}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openSettings()}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">{MENU_LABELS.settings}</span>
            </div>
            <Devider />
            <div
                onClick={goFullScreen}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goFullScreen()}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">{isFullScreen ? MENU_LABELS.exitFullScreen : MENU_LABELS.enterFullScreen}</span>
            </div>
        </div>
    )
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}


export default DesktopMenu
