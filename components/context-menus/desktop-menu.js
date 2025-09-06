import React, { useState } from 'react';

function DesktopMenu(props) {
    const [showApps, setShowApps] = useState(false);

    const openTerminal = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('terminal_cwd', 'desktop');
        }
        props.openApp && props.openApp('terminal');
    };

    const openSettings = () => {
        props.openApp && props.openApp('settings');
    };

    const createLauncher = () => {
        props.openShortcutSelector && props.openShortcutSelector();
    };

    const createUrlLink = () => {
        props.createUrlLink && props.createUrlLink();
    };

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <div
                className="relative"
                onMouseEnter={() => setShowApps(true)}
                onMouseLeave={() => setShowApps(false)}
            >
                <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="true"
                    aria-expanded={showApps}
                    className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
                >
                    <span className="ml-5">Applications ▸</span>
                </button>
                <div
                    role="menu"
                    aria-label="Applications"
                    className={(showApps ? ' block ' : ' hidden ') + ' absolute top-0 left-full ml-1 cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 z-50'}
                >
                    {props.apps && props.apps.map(app => (
                        <button
                            key={app.id}
                            type="button"
                            role="menuitem"
                            onClick={() => props.openApp(app.id)}
                            className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
                        >
                            <span className="ml-5">{app.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={createLauncher}
                type="button"
                role="menuitem"
                aria-label="Create Launcher"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Launcher...</span>
            </button>

            <button
                onClick={createUrlLink}
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
                <span className="ml-5">Create Folder</span>
            </button>

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
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Desktop Settings"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Desktop Settings</span>
            </button>
        </div>
    );
}

export default DesktopMenu;

