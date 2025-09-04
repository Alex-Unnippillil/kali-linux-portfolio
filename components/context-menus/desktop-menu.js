import React from 'react'

/**
 * Context menu shown when the user right-clicks on an empty area of the desktop.
 * All actions are stubbed and can be wired to real handlers later.
 */
function DesktopMenu({
    active,
    openApp,
    addNewFolder,
    openShortcutSelector
}) {
    const openTerminal = () => {
        if (openApp) openApp('terminal')
    }

    const createLauncher = () => {
        if (openShortcutSelector) openShortcutSelector()
    }

    const createFolder = () => {
        if (addNewFolder) addNewFolder()
    }

    const paste = () => {
        // stub action for paste
        console.log('paste stub')
    }

    const openSettings = () => {
        if (openApp) openApp('settings')
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={
                (active ? ' block ' : ' hidden ') +
                ' cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-2 absolute z-50 text-sm'
            }
        >
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open Terminal Here"
                className="w-full text-left py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Open Terminal Here</span>
            </button>
            <button
                onClick={createLauncher}
                type="button"
                role="menuitem"
                aria-label="Create Launcher"
                className="w-full text-left py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Create Launcher</span>
            </button>
            <button
                onClick={createFolder}
                type="button"
                role="menuitem"
                aria-label="Create Folder"
                className="w-full text-left py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Create Folder</span>
            </button>
            <button
                onClick={paste}
                type="button"
                role="menuitem"
                aria-label="Paste"
                className="w-full text-left py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Paste</span>
            </button>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Desktop Settings"
                className="w-full text-left py-1 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Desktop Settings…</span>
            </button>
        </div>
    )
}

export default DesktopMenu

