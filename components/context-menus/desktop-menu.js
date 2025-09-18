import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'
import ContextMenuItem from '../menu/context-menu-item'

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
            logger.error(e)
        }
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={(props.active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <ContextMenuItem
                onClick={props.addNewFolder}
                aria-label="New Folder"
            >
                <span className="ml-5">New Folder</span>
            </ContextMenuItem>
            <ContextMenuItem
                onClick={props.openShortcutSelector}
                aria-label="Create Shortcut"
            >
                <span className="ml-5">Create Shortcut...</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem disabled aria-label="Paste" className="text-gray-400">
                <span className="ml-5">Paste</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem disabled aria-label="Show Desktop in Files" className="text-gray-400">
                <span className="ml-5">Show Desktop in Files</span>
            </ContextMenuItem>
            <ContextMenuItem
                onClick={openTerminal}
                aria-label="Open in Terminal"
            >
                <span className="ml-5">Open in Terminal</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem
                onClick={openSettings}
                aria-label="Change Background"
            >
                <span className="ml-5">Change Background...</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem disabled aria-label="Display Settings" className="text-gray-400">
                <span className="ml-5">Display Settings</span>
            </ContextMenuItem>
            <ContextMenuItem
                onClick={openSettings}
                aria-label="Settings"
            >
                <span className="ml-5">Settings</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem
                onClick={goFullScreen}
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
                <span className="ml-5">{isFullScreen ? "Exit" : "Enter"} Full Screen</span>
            </ContextMenuItem>
            <Devider />
            <ContextMenuItem
                onClick={props.clearSession}
                aria-label="Clear Session"
            >
                <span className="ml-5">Clear Session</span>
            </ContextMenuItem>
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
