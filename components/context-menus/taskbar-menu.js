import React, { useEffect, useRef } from 'react';
import useMenuFocusManagement from '../../hooks/useMenuFocusManagement';

function TaskbarMenu(props) {
    const { active, restoreFocusRef, onCloseMenu, onMinimize, onClose, minimized } = props;
    const menuRef = useRef(null);
    useMenuFocusManagement({
        containerRef: menuRef,
        active,
        orientation: 'vertical',
        restoreFocusRef,
    });

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const handlePointer = (event) => {
            if (!menuRef.current || menuRef.current.contains(event.target)) {
                return;
            }
            onCloseMenu && onCloseMenu();
        };

        const handleKey = (event) => {
            if (event.key !== 'Escape') {
                return;
            }
            event.preventDefault();
            onCloseMenu && onCloseMenu();
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [active, onCloseMenu]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCloseMenu && onCloseMenu();
        }
    };

    const handleMinimize = () => {
        onMinimize && onMinimize();
        onCloseMenu && onCloseMenu();
    };

    const handleClose = () => {
        onClose && onClose();
        onCloseMenu && onCloseMenu();
    };

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label={minimized ? 'Restore Window' : 'Minimize Window'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{minimized ? 'Restore' : 'Minimize'}</span>
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
