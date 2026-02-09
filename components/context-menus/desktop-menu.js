import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'

function DesktopMenu(props) {

    const [isFullScreen, setIsFullScreen] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)
    const iconSizePreset = props.iconSizePreset || 'medium'
    const iconSizeBucket = props.iconSizeBucket
    const iconSizeBucketLabel = props.iconSizeBucketLabel || 'current display'
    const setIconSizePreset = typeof props.setIconSizePreset === 'function' ? props.setIconSizePreset : () => { }
    const iconSizeOptions = [
        { value: 'small', label: 'Small Icons' },
        { value: 'medium', label: 'Medium Icons' },
        { value: 'large', label: 'Large Icons' },
    ]

    useEffect(() => {
        // Prevent SSR/client hydration mismatches for UI that depends on client-only state like viewport size.
        // We intentionally render a stable, SSR-safe label until after the first client mount.
        setIsHydrated(true)
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
            className={(props.active ? " block " : " hidden ") + " cursor-default w-56 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm shadow-lg backdrop-blur-sm"}
        >
            <button
                onClick={props.addNewFolder}
                type="button"
                role="menuitem"
                aria-label="New Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between group"
            >
                <span className="ml-5">New Folder</span>
                <span className="mr-4 text-xs text-gray-500 group-hover:text-gray-400">Ctrl+Shift+N</span>
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
            <Devider />
            <div className="px-5 pb-1 text-xs tracking-wide uppercase text-ub-warm-grey text-opacity-80">
                View
            </div>
            <div
                className="px-5 pb-2 text-[0.65rem] uppercase tracking-wide text-ub-warm-grey text-opacity-60"
                suppressHydrationWarning
            >
                {`Applies to ${isHydrated ? iconSizeBucketLabel : 'current display'}`}
            </div>
            {iconSizeOptions.map((option) => {
                const isActive = iconSizePreset === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => setIconSizePreset(option.value, { bucketId: iconSizeBucket })}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        className={(isActive ? " text-ubt-blue " : "") + " group w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between"}
                    >
                        <span className="ml-5">{option.label}</span>
                        <span
                            aria-hidden="true"
                            className={(isActive ? " opacity-100 " : " opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60 ") + " mr-5 text-xs transition-opacity"}
                        >
                            ✓
                        </span>
                    </button>
                )
            })}
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
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between group"
            >
                <span className="ml-5">Open in Terminal</span>
                <span className="mr-4 text-xs text-gray-500 group-hover:text-gray-400">Ctrl+Alt+T</span>
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
