import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'
import MenuRow from './MenuRow'
import useKeymap from '../../apps/settings/keymapRegistry'

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)
    const { shortcuts } = useKeymap()
    const openSettingsShortcut = shortcuts.find((s) => s.description === 'Open settings')?.keys || null

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
            <button
                onClick={props.addNewFolder}
                type="button"
                role="menuitem"
                aria-label="New Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="New Folder" />
            </button>
            <button
                onClick={props.openShortcutSelector}
                type="button"
                role="menuitem"
                aria-label="Create Shortcut"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="Create Shortcut..." />
            </button>
            <Devider />
            <div role="menuitem" aria-label="Paste" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <MenuRow label="Paste" />
            </div>
            <Devider />
            <div role="menuitem" aria-label="Show Desktop in Files" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <MenuRow label="Show Desktop in Files" />
            </div>
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open in Terminal"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="Open in Terminal" />
            </button>
            <Devider />
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Change Background"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="Change Background..." />
            </button>
            <Devider />
            <div role="menuitem" aria-label="Display Settings" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <MenuRow label="Display Settings" />
            </div>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Settings"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="Settings" accel={openSettingsShortcut} />
            </button>
            <Devider />
            <button
                onClick={goFullScreen}
                type="button"
                role="menuitem"
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label={`${isFullScreen ? "Exit" : "Enter"} Full Screen`} />
            </button>
            <Devider />
            <button
                onClick={props.clearSession}
                type="button"
                role="menuitem"
                aria-label="Clear Session"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <MenuRow label="Clear Session" />
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
