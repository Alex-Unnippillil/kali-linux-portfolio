import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function DockMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const runAction = (callback, enabled = true) => () => {
        if (!enabled) return;
        if (typeof callback === 'function') {
            callback();
        }
        if (props.onCloseMenu) {
            props.onCloseMenu();
        }
    };

    const minimizeLabel = props.isMinimized ? 'Show' : 'Hide';
    const minimizeAriaLabel = props.isMinimized ? 'Show Window' : 'Hide Window';

    return (
        <div
            id="dock-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={
                (props.active ? ' block ' : ' hidden ')
                + ' cursor-default w-48 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'
            }
        >
            <button
                type="button"
                onClick={runAction(props.onQuit, props.canQuit)}
                role="menuitem"
                aria-label="Quit Application"
                aria-disabled={props.canQuit ? 'false' : 'true'}
                disabled={!props.canQuit}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="ml-5">Quit</span>
            </button>
            <button
                type="button"
                onClick={runAction(props.onToggleMinimize, props.canToggleMinimize)}
                role="menuitem"
                aria-label={minimizeAriaLabel}
                aria-disabled={props.canToggleMinimize ? 'false' : 'true'}
                disabled={!props.canToggleMinimize}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="ml-5">{minimizeLabel}</span>
            </button>
            <button
                type="button"
                onClick={runAction(props.onNewWindow, props.canNewWindow)}
                role="menuitem"
                aria-label="Open New Window"
                aria-disabled={props.canNewWindow ? 'false' : 'true'}
                disabled={!props.canNewWindow}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span className="ml-5">New Window</span>
            </button>
            {props.canUnpin ? (
                <button
                    type="button"
                    onClick={runAction(props.onUnpin, true)}
                    role="menuitem"
                    aria-label="Unpin from Dock"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">Unpin</span>
                </button>
            ) : null}
        </div>
    );
}

DockMenu.defaultProps = {
    canQuit: false,
    canToggleMinimize: false,
    canNewWindow: false,
    canUnpin: false,
    isMinimized: false,
};

export default DockMenu;
