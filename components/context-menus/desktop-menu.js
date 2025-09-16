import React from 'react'

function DesktopMenu(props) {

    const openTerminal = () => {
        props.openApp("terminal");
    }

    const openSettings = () => {
        props.openApp("settings");
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={(props.active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <div role="menuitem" aria-label="Create Launcher" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Create Launcher...</span>
            </div>
            <button
                onClick={props.openShortcutSelector}
                type="button"
                role="menuitem"
                aria-label="Create URL Link"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create URL Link...</span>
            </button>
            <button
                onClick={props.addNewFolder}
                type="button"
                role="menuitem"
                aria-label="Create Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Folder...</span>
            </button>
            <div role="menuitem" aria-label="Create Document" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Create Document</span>
            </div>
            <Devider />
            <div role="menuitem" aria-label="Paste" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Paste</span>
            </div>
            <Devider />
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open Terminal Here"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Open Terminal Here</span>
            </button>
            <div role="menuitem" aria-label="Open as Root" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Open as Root</span>
            </div>
            <div role="menuitem" aria-label="Open in New Window" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Open in New Window</span>
            </div>
            <Devider />
            <div role="menuitem" aria-label="Arrange Desktop Icons" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Arrange Desktop Icons</span>
            </div>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Desktop Settings"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Desktop Settings</span>
            </button>
            <Devider />
            <button
                onClick={props.showAllApps}
                type="button"
                role="menuitem"
                aria-label="Applications"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Applications</span>
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
