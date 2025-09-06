import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'
import { getSendToTargets } from '../../utils/sendTo'

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)
    const [sendToTargets, setSendToTargets] = useState([])

    useEffect(() => {
        document.addEventListener('fullscreenchange', checkFullScreen);
        getSendToTargets().then(setSendToTargets)
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

    const handleSendTo = (target) => {
        switch (target.action) {
            case 'desktop':
                alert('Shortcut created on Desktop')
                break
            case 'trash':
                alert('Item moved to Trash')
                break
            case 'archive':
                alert('Item archived')
                break
            default:
                alert(`Sent to ${target.label}`)
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
                <span className="ml-5">New Folder</span>
            </button>
            <button
                onClick={props.openShortcutSelector}
                type="button"
                role="menuitem"
                aria-label="Create Shortcut"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Shortcut...</span>
            </button>
            <button
                onClick={props.openLauncherCreator}
                type="button"
                role="menuitem"
                aria-label="Create Launcher"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Launcher...</span>
            </button>
            <Devider />
            <div role="menuitem" aria-label="Paste" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Paste</span>
            </div>
            <Devider />
            <div className="relative group">
                <div role="menuitem" aria-label="Send To" aria-haspopup="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex justify-between items-center">
                    <span className="ml-5">Send To</span>
                    <span className="mr-2">▶</span>
                </div>
                <div className="hidden group-hover:block absolute top-0 left-full w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 z-50 text-sm">
                    {sendToTargets.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => handleSendTo(t)}
                            type="button"
                            role="menuitem"
                            className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
                        >
                            <span className="ml-5">{t.label}</span>
                        </button>
                    ))}
                </div>
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
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Open in Terminal</span>
            </button>
            <Devider />
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Change Background"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
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
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Settings</span>
            </button>
            <Devider />
            <button
                onClick={goFullScreen}
                type="button"
                role="menuitem"
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{isFullScreen ? "Exit" : "Enter"} Full Screen</span>
            </button>
            <Devider />
            <button
                onClick={props.clearSession}
                type="button"
                role="menuitem"
                aria-label="Clear Session"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
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
