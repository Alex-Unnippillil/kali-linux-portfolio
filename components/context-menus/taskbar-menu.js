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
            className={(props.active ? ' block ' : ' hidden ') + ' absolute z-50 w-44 cursor-default rounded-lg border border-gray-900 p-2 text-left text-sm text-white shadow-xl context-menu-bg'}
        >
            <MenuButton
                onClick={handleMinimize}
                ariaLabel={props.minimized ? 'Restore Window' : 'Minimize Window'}
            >
                {props.minimized ? 'Restore' : 'Minimize'}
            </MenuButton>
            <MenuButton onClick={handleClose} ariaLabel="Close Window">
                Close
            </MenuButton>
        </div>
    );
}

function MenuButton({ onClick, ariaLabel, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            role="menuitem"
            aria-label={ariaLabel}
            className="w-full rounded px-4 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-gray-700/70"
        >
            {children}
        </button>
    );
}

export default TaskbarMenu;
