import React, { useState, useEffect } from 'react'
import logger from '../../utils/logger'
import { MenuItemsList } from '../common/ContextMenu'

/** @typedef {import('../common/ContextMenu').MenuItem} MenuItem */

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

    /** @type {MenuItem[]} */
    const mainActions = [
        {
            id: 'new-folder',
            label: 'New Folder',
            onSelect: props.addNewFolder,
        },
        {
            id: 'create-shortcut',
            label: 'Create Shortcut...',
            onSelect: props.openShortcutSelector,
        },
    ]

    /** @type {MenuItem[]} */
    const clipboardActions = [
        {
            id: 'paste',
            label: 'Paste',
            disabled: true,
            onSelect: () => { },
        },
    ]

    /** @type {MenuItem[]} */
    const terminalActions = [
        {
            id: 'show-desktop',
            label: 'Show Desktop in Files',
            disabled: true,
            onSelect: () => { },
        },
        {
            id: 'open-terminal',
            label: 'Open in Terminal',
            onSelect: openTerminal,
        },
    ]

    /** @type {MenuItem[]} */
    const appearanceActions = [
        {
            id: 'change-background',
            label: 'Change Background...',
            onSelect: openSettings,
        },
    ]

    /** @type {MenuItem[]} */
    const settingsActions = [
        {
            id: 'display-settings',
            label: 'Display Settings',
            disabled: true,
            onSelect: () => { },
        },
        {
            id: 'settings',
            label: 'Settings',
            onSelect: openSettings,
        },
    ]

    /** @type {MenuItem[]} */
    const screenActions = [
        {
            id: 'toggle-fullscreen',
            label: `${isFullScreen ? 'Exit' : 'Enter'} Full Screen`,
            onSelect: goFullScreen,
        },
    ]

    /** @type {MenuItem[]} */
    const sessionActions = [
        {
            id: 'clear-session',
            label: 'Clear Session',
            onSelect: props.clearSession,
        },
    ]

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={(props.active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <MenuItemsList items={mainActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={clipboardActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={terminalActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={appearanceActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={settingsActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={screenActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
            <Devider />
            <MenuItemsList items={sessionActions} itemClassName='hover:bg-ub-warm-grey hover:bg-opacity-20' />
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
