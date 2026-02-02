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

    const handleNewWindow = () => {
        props.onNewWindow && props.onNewWindow();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleTogglePin = () => {
        if (props.pinned) {
            props.onUnpin && props.onUnpin();
        } else {
            props.onPin && props.onPin();
        }
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleToggleMaximize = () => {
        if (props.isMaximized) {
            props.onRestore && props.onRestore();
        } else {
            props.onMaximize && props.onMaximize();
        }
        props.onCloseMenu && props.onCloseMenu();
    };

    const workspaces = Array.isArray(props.workspaces) ? props.workspaces : [];
    const hasWorkspaces = workspaces.length > 1;
    const allowMaximize = props.allowMaximize !== false;

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            {props.supportsNewWindow ? (
                <button
                    type="button"
                    onClick={handleNewWindow}
                    role="menuitem"
                    aria-label="Open new window"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">New window</span>
                </button>
            ) : null}
            <button
                type="button"
                onClick={handleTogglePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from taskbar' : 'Pin to taskbar'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.pinned ? 'Unpin from taskbar' : 'Pin to taskbar'}</span>
            </button>
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
                onClick={handleToggleMaximize}
                role="menuitem"
                aria-label={props.isMaximized ? 'Restore Window size' : 'Maximize Window'}
                disabled={!allowMaximize}
                aria-disabled={!allowMaximize}
                className={`w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 ${allowMaximize ? '' : 'opacity-50 cursor-not-allowed'}`}
            >
                <span className="ml-5">{props.isMaximized ? 'Restore' : 'Maximize'}</span>
            </button>
            {hasWorkspaces ? (
                <div className="my-2 border-t border-white/10">
                    <p className="px-5 py-1 text-xs uppercase tracking-wide text-white/60">Move to workspace</p>
                    {workspaces.map((workspace) => (
                        <button
                            type="button"
                            key={workspace.id}
                            onClick={() => {
                                if (props.onMoveWorkspace) {
                                    props.onMoveWorkspace(workspace.id);
                                }
                                props.onCloseMenu && props.onCloseMenu();
                            }}
                            role="menuitem"
                            aria-label={`Move to workspace ${workspace.label || workspace.id + 1}`}
                            disabled={workspace.id === props.activeWorkspace}
                            aria-disabled={workspace.id === props.activeWorkspace}
                            className={`w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 ${workspace.id === props.activeWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className="ml-5">Workspace {workspace.label || workspace.id + 1}</span>
                        </button>
                    ))}
                </div>
            ) : null}
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
