import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const availableWorkspaces = (props.workspaces || []).filter(
        (workspace) => typeof workspace.id === 'number' && workspace.id !== props.activeWorkspace
    );

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

    const handleMove = (workspaceId) => {
        if (props.onMoveToWorkspace) {
            props.onMoveToWorkspace(workspaceId);
        }
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
            {availableWorkspaces.length > 0 && (
                <div className="mt-1 border-t border-gray-800 pt-1">
                    <p className="px-5 pb-1 text-[11px] uppercase tracking-wide text-gray-300/70">
                        Move to workspace
                    </p>
                    {availableWorkspaces.map((workspace) => (
                        <button
                            key={workspace.id}
                            type="button"
                            onClick={() => handleMove(workspace.id)}
                            role="menuitem"
                            aria-label={`Move window to ${workspace.label}`}
                            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                        >
                            <span className="ml-5">{workspace.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TaskbarMenu;
