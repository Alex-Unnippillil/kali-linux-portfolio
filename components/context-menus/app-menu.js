import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function AppMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handlePin = () => {
        if (props.pinned) {
            props.unpinApp && props.unpinApp()
        } else {
            props.pinApp && props.pinApp()
        }
    }

    const handleOpenNewInstance = () => {
        props.onOpenNewInstance && props.onOpenNewInstance()
        props.onClose && props.onClose()
    }

    const handleViewDetails = () => {
        props.onViewDetails && props.onViewDetails()
        props.onClose && props.onClose()
    }

    const handleWorkspaceSelect = (workspaceId) => {
        if (props.onAssignWorkspace) {
            props.onAssignWorkspace(workspaceId)
        }
        props.onClose && props.onClose()
    }

    return (
        <div
            id="app-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
            {props.onOpenNewInstance && (
                <button
                    type="button"
                    onClick={handleOpenNewInstance}
                    role="menuitem"
                    aria-label="Open new window"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">Open New Window</span>
                </button>
            )}
            {Array.isArray(props.workspaces) && props.workspaces.length > 0 && props.onAssignWorkspace && (
                <div className="mt-2 border-t border-gray-800 pt-2">
                    <p className="px-5 pb-1 text-xs uppercase tracking-wide text-gray-400">Move to Workspace</p>
                    {props.workspaces.map((workspace) => (
                        <button
                            key={workspace.id}
                            type="button"
                            onClick={() => handleWorkspaceSelect(workspace.id)}
                            role="menuitem"
                            aria-label={`Move to ${workspace.label}`}
                            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                        >
                            <span className="ml-5">{workspace.label}</span>
                        </button>
                    ))}
                </div>
            )}
            {props.onViewDetails && (
                <button
                    type="button"
                    onClick={handleViewDetails}
                    role="menuitem"
                    aria-label="View app details"
                    className="mt-2 w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                >
                    <span className="ml-5">View Details</span>
                </button>
            )}
        </div>
    )
}

export default AppMenu
