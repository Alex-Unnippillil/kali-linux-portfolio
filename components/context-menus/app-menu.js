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
                className="w-full text-left cursor-default mb-1.5 flex min-h-[44px] items-center rounded px-4 py-2 hover:bg-gray-700"
            >
                <span className="ml-2">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

export default AppMenu
