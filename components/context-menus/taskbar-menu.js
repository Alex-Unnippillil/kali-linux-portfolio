import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
    const isActive = props.active && !props.disabled;
    useFocusTrap(menuRef, isActive);
    useRovingTabIndex(menuRef, isActive, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const handleMinimize = () => {
        if (props.disabled) return;
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        if (props.disabled) return;
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!isActive}
            aria-disabled={props.disabled ? true : undefined}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(isActive ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm' + (props.disabled ? ' opacity-60 pointer-events-none' : '')}
        >
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label={props.minimized ? 'Restore Window' : 'Minimize Window'}
                disabled={props.disabled}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </button>
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                disabled={props.disabled}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">Close</span>
            </button>
        </div>
    );
}

export default TaskbarMenu;
