import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
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

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm shadow-xl overflow-y-auto backdrop-blur-md'}
            style={{
                width: 'min(12rem, calc(100vw - 1.5rem))',
                maxHeight: 'calc(100vh - 2rem)',
            }}
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
        </div>
    );
}

export default TaskbarMenu;
