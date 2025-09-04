import React from 'react'

function DesktopMenu(props) {
    const openTerminal = () => {
        props.openApp('terminal')
    }

    const createLauncher = () => {
        if (typeof props.openShortcutSelector === 'function') {
            props.openShortcutSelector()
        }
    }

    const createFolder = () => {
        if (typeof props.addNewFolder === 'function') {
            props.addNewFolder()
        }
    }

    const paste = () => {
        if (typeof props.onPaste === 'function') {
            props.onPaste()
        }
    }

    const openSettings = () => {
        props.openApp('settings')
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open Terminal Here"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Open Terminal Here</span>
            </button>
            <button
                onClick={createLauncher}
                type="button"
                role="menuitem"
                aria-label="Create Launcher"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Launcher</span>
            </button>
            <button
                onClick={createFolder}
                type="button"
                role="menuitem"
                aria-label="Create Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Folder</span>
            </button>
            <button
                onClick={paste}
                type="button"
                role="menuitem"
                aria-label="Paste"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Paste</span>
            </button>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Desktop Settings"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Desktop Settings</span>
            </button>
        </div>
    )
}

export default DesktopMenu
