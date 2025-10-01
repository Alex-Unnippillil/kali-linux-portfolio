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
            className={(props.active ? " block " : " hidden ") + " absolute z-50 w-56 cursor-default rounded-lg border border-gray-900 p-2 text-left text-sm text-white shadow-xl context-menu-bg"}
        >
            <MenuSection label="Desktop">
                <MenuButton
                    onClick={props.addNewFolder}
                    ariaLabel="New Folder"
                >
                    New Folder
                </MenuButton>
                <MenuButton
                    onClick={props.openShortcutSelector}
                    ariaLabel="Create Shortcut"
                >
                    Create Shortcut...
                </MenuButton>
            </MenuSection>
            <Separator />
            <MenuSection label="Clipboard">
                <MenuButton ariaLabel="Paste" disabled>
                    Paste
                </MenuButton>
            </MenuSection>
            <Separator />
            <MenuSection label="Navigation">
                <MenuButton ariaLabel="Show Desktop in Files" disabled>
                    Show Desktop in Files
                </MenuButton>
                <MenuButton onClick={openTerminal} ariaLabel="Open in Terminal">
                    Open in Terminal
                </MenuButton>
            </MenuSection>
            <Separator />
            <MenuSection label="Personalize">
                <MenuButton onClick={openSettings} ariaLabel="Change Background">
                    Change Background...
                </MenuButton>
                <MenuButton ariaLabel="Display Settings" disabled>
                    Display Settings
                </MenuButton>
                <MenuButton onClick={openSettings} ariaLabel="Settings">
                    Settings
                </MenuButton>
            </MenuSection>
            <Separator />
            <MenuSection label="Session">
                <MenuButton
                    onClick={goFullScreen}
                    ariaLabel={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                    {isFullScreen ? "Exit" : "Enter"} Full Screen
                </MenuButton>
                <MenuButton onClick={props.clearSession} ariaLabel="Clear Session">
                    Clear Session
                </MenuButton>
            </MenuSection>
        </div>
    )
}

function MenuSection({ label, children }) {
    return (
        <div role="none" className="py-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ubt-grey">{label}</p>
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    )
}

function MenuButton({ onClick, children, ariaLabel, disabled }) {
    return (
        <button
            onClick={onClick}
            type="button"
            role="menuitem"
            aria-label={ariaLabel}
            disabled={disabled}
            aria-disabled={disabled}
            className={`w-full rounded px-4 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${disabled ? 'cursor-not-allowed text-gray-500' : 'hover:bg-gray-700/70'}`}
        >
            {children}
        </button>
    )
}

function Separator() {
    return <div role="separator" className="mx-2 my-2 border-t border-white/10" />
}


export default DesktopMenu
