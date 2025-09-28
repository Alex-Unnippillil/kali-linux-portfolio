import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)

    useEffect(() => {
        document.addEventListener('fullscreenchange', checkFullScreen);
        return () => {
            document.removeEventListener('fullscreenchange', checkFullScreen);
        };
    }, [])


    const openTerminal = () => {
        props.openApp && props.openApp("terminal")
    }

    const openSettings = () => {
        props.openApp && props.openApp("settings")
    }

    const handleRefreshDesktop = () => {
        if (typeof props.refreshDesktop === 'function') {
            props.refreshDesktop()
        }
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
            logger.error(e)
        }
    }

    const baseItemClasses = "flex w-full items-center rounded-md px-4 py-1.5 text-left text-sm font-medium text-white/90 transition-colors duration-150 hover:bg-[var(--color-accent)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-0 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:text-white/35 disabled:hover:bg-transparent disabled:focus-visible:ring-0"
    const dangerItemClasses = "flex w-full items-center rounded-md px-4 py-1.5 text-left text-sm font-medium text-red-300 transition-colors duration-150 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={`${props.active ? 'block' : 'hidden'} glass absolute z-50 w-60 cursor-default rounded-xl py-3 text-left text-sm shadow-2xl`}
        >
            <div className="flex flex-col gap-1">
                <button
                    onClick={props.addNewFolder}
                    type="button"
                    role="menuitem"
                    aria-label="Create Folder"
                    className={baseItemClasses}
                >
                    Create Folder
                </button>
                <button
                    onClick={props.openShortcutSelector}
                    type="button"
                    role="menuitem"
                    aria-label="Add Launcher"
                    className={baseItemClasses}
                >
                    Add Launcher…
                </button>
                <button
                    onClick={handleRefreshDesktop}
                    type="button"
                    role="menuitem"
                    aria-label="Refresh Desktop"
                    className={baseItemClasses}
                >
                    Refresh Desktop
                </button>
                <Devider />
                <button
                    type="button"
                    role="menuitem"
                    aria-label="Paste Items"
                    disabled
                    className={baseItemClasses}
                >
                    Paste Items
                </button>
                <button
                    type="button"
                    role="menuitem"
                    aria-label="Open Desktop in File Manager"
                    disabled
                    className={baseItemClasses}
                >
                    Open Desktop in File Manager
                </button>
                <button
                    onClick={openTerminal}
                    type="button"
                    role="menuitem"
                    aria-label="Open Terminal Here"
                    className={baseItemClasses}
                >
                    Open Terminal Here
                </button>
                <Devider />
                <button
                    onClick={openSettings}
                    type="button"
                    role="menuitem"
                    aria-label="Change Wallpaper"
                    className={baseItemClasses}
                >
                    Change Wallpaper…
                </button>
                <button
                    type="button"
                    role="menuitem"
                    aria-label="Display Settings"
                    disabled
                    className={baseItemClasses}
                >
                    Display Settings
                </button>
                <button
                    onClick={openSettings}
                    type="button"
                    role="menuitem"
                    aria-label="System Settings"
                    className={baseItemClasses}
                >
                    System Settings
                </button>
                <Devider />
                <button
                    onClick={goFullScreen}
                    type="button"
                    role="menuitem"
                    aria-label={isFullScreen ? "Exit Fullscreen Mode" : "Enter Fullscreen Mode"}
                    className={baseItemClasses}
                >
                    {isFullScreen ? 'Exit Fullscreen Mode' : 'Enter Fullscreen Mode'}
                </button>
                <Devider />
                <button
                    onClick={props.clearSession}
                    type="button"
                    role="menuitem"
                    aria-label="Reset Session"
                    className={dangerItemClasses}
                >
                    Reset Session
                </button>
            </div>
        </div>
    )
}

function Devider() {
    return (
        <div className="px-3 py-1">
            <div className="h-px w-full bg-white/10"></div>
        </div>
    );
}


export default DesktopMenu
