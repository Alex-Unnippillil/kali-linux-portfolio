import React, { useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowMenu(props) {
    const menuRef = useRef(null);
    const [showWs, setShowWs] = useState(false);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const handleMinimize = () => {
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleMove = (ws) => {
        props.onMove && props.onMove(ws);
        props.onCloseMenu && props.onCloseMenu();
    };

    return (
        <div
            id="window-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label={props.minimized ? 'Restore Window' : 'Minimize Window'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </button>
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Close</span>
            </button>
            <div className="relative" onMouseEnter={() => setShowWs(true)} onMouseLeave={() => setShowWs(false)}>
                <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="true"
                    aria-expanded={showWs}
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                    onFocus={() => setShowWs(true)}
                    onBlur={() => setShowWs(false)}
                >
                    <span className="ml-5">Move to Workspace ▸</span>
                </button>
                <div className={(showWs ? 'block ' : 'hidden ') + ' absolute top-0 left-full ml-1 cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2'}>
                    {props.workspaces && props.workspaces.map((ws, i) => (
                        <button
                            key={ws}
                            type="button"
                            role="menuitem"
                            onClick={() => handleMove(i)}
                            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                        >
                            <span className="ml-5">{ws}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default WindowMenu;
