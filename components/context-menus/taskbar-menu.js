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

    const handleMove = (ws) => {
        props.onMove && props.onMove(ws);
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
            {props.workspaces && props.workspaces.length > 0 && (
                <>
                    <Devider />
                    {props.workspaces.map((w) => (
                        <button
                            key={w}
                            type="button"
                            role="menuitem"
                            aria-label={`Move to workspace ${w + 1}`}
                            onClick={() => handleMove(w)}
                            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                        >
                            <span className="ml-5">Workspace {w + 1}</span>
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default TaskbarMenu;
