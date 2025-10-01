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

    const handleTaskbarPin = () => {
        if (props.taskbarPinned) {
            props.unpinFromTaskbar && props.unpinFromTaskbar()
        } else {
            props.pinToTaskbar && props.pinToTaskbar()
        }
    }

    const handleVisibilityToggle = () => {
        if (props.isHidden) {
            props.restoreApp && props.restoreApp()
        } else {
            props.removeApp && props.removeApp()
        }
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
            <button
                type="button"
                onClick={handleTaskbarPin}
                role="menuitem"
                aria-label={props.taskbarPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.taskbarPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}</span>
            </button>
            <button
                type="button"
                onClick={handleVisibilityToggle}
                role="menuitem"
                aria-label={props.isHidden ? 'Restore application to list' : 'Remove application from list'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.isHidden ? 'Restore to List' : 'Remove from List'}</span>
            </button>
        </div>
    )
}

export default AppMenu
