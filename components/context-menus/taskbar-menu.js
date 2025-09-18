import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import ContextMenuItem from '../menu/context-menu-item';

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
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <ContextMenuItem
                onClick={handleMinimize}
                aria-label={props.minimized ? 'Restore Window' : 'Minimize Window'}
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </ContextMenuItem>
            <ContextMenuItem
                onClick={handleClose}
                aria-label="Close Window"
            >
                <span className="ml-5">Close</span>
            </ContextMenuItem>
        </div>
    );
}

export default TaskbarMenu;
