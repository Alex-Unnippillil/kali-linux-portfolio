import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const hasContextApp = Boolean(props.contextApp);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const handleMinimize = () => {
        if (!hasContextApp) {
            return;
        }
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        if (!hasContextApp) {
            return;
        }
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    const buttonClass = (disabled) =>
        `w-full text-left cursor-default py-0.5 mb-1.5 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
        }`;

    return (
        <div
            id="taskbar-menu"
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
                disabled={!hasContextApp}
                aria-disabled={!hasContextApp}
                className={buttonClass(!hasContextApp)}
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </button>
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                disabled={!hasContextApp}
                aria-disabled={!hasContextApp}
                className={buttonClass(!hasContextApp)}
            >
                <span className="ml-5">Close</span>
            </button>
        </div>
    );
}

export default TaskbarMenu;
