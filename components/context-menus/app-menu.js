import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function AppMenu(props) {
    const menuRef = useRef(null)
    const isActive = props.active && !props.disabled
    useFocusTrap(menuRef, isActive)
    useRovingTabIndex(menuRef, isActive, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handlePin = () => {
        if (props.disabled) return
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
            aria-hidden={!isActive}
            aria-disabled={props.disabled ? true : undefined}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(isActive ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm' + (props.disabled ? ' opacity-60 pointer-events-none' : '')}
        >
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                disabled={props.disabled}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

export default AppMenu
