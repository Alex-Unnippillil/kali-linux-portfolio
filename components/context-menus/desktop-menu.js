import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)
    const isActive = props.active && !props.disabled

    useEffect(() => {
        document.addEventListener('fullscreenchange', checkFullScreen);
        return () => {
            document.removeEventListener('fullscreenchange', checkFullScreen);
        };
    }, [])


    const openTerminal = () => {
        if (props.disabled) return
        props.openApp("terminal");
    }

    const openSettings = () => {
        if (props.disabled) return
        props.openApp("settings");
    }

    const handleAddNewFolder = () => {
        if (props.disabled) return
        props.addNewFolder && props.addNewFolder()
    }

    const handleShortcutSelector = () => {
        if (props.disabled) return
        props.openShortcutSelector && props.openShortcutSelector()
    }

    const handleClearSession = () => {
        if (props.disabled) return
        props.clearSession && props.clearSession()
    }

    const checkFullScreen = () => {
        if (document.fullscreenElement) {
            setIsFullScreen(true)
        } else {
            setIsFullScreen(false)
        }
    }

    const goFullScreen = () => {
        if (props.disabled) return
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

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            aria-hidden={!isActive}
            aria-disabled={props.disabled ? true : undefined}
            className={(isActive ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm" + (props.disabled ? " opacity-60 pointer-events-none" : "")}
        >
            <button
                onClick={handleAddNewFolder}
                type="button"
                role="menuitem"
                aria-label="New Folder"
                onMouseDown={props.disabled ? (e) => e.preventDefault() : undefined}
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">New Folder</span>
            </button>
            <button
                onClick={handleShortcutSelector}
                type="button"
                role="menuitem"
                aria-label="Create Shortcut"
                onMouseDown={props.disabled ? (e) => e.preventDefault() : undefined}
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Create Shortcut...</span>
            </button>
            <Devider />
            <div role="menuitem" aria-label="Paste" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Paste</span>
            </div>
            <Devider />
            <div role="menuitem" aria-label="Show Desktop in Files" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Show Desktop in Files</span>
            </div>
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open in Terminal"
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Open in Terminal</span>
            </button>
            <Devider />
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Change Background"
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Change Background...</span>
            </button>
            <Devider />
            <div role="menuitem" aria-label="Display Settings" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Display Settings</span>
            </div>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Settings"
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Settings</span>
            </button>
            <Devider />
            <button
                onClick={goFullScreen}
                type="button"
                role="menuitem"
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">{isFullScreen ? "Exit" : "Enter"} Full Screen</span>
            </button>
            <Devider />
            <button
                onClick={handleClearSession}
                type="button"
                role="menuitem"
                aria-label="Clear Session"
                disabled={props.disabled}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Clear Session</span>
            </button>
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
