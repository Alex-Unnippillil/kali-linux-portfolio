import React, { useRef, useId } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function AppMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    const hintId = useId()
    const roving = useRovingTabIndex({
        itemCount: props.active ? 1 : 0,
        orientation: 'vertical',
        enabled: props.active,
    })

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
            aria-describedby={hintId}
            ref={menuRef}
            onKeyDown={(e) => {
                roving.onKeyDown(e)
                handleKeyDown(e)
            }}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <p id={hintId} className="sr-only">
                Use arrow keys to move within the menu. Home and End jump to the first or last item.
            </p>
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                {...roving.getItemProps(0)}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

export default AppMenu
