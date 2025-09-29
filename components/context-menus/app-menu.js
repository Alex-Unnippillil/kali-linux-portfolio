import React from 'react'
import MenuSurface from './MenuSurface'

function AppMenu(props) {
    const handlePin = () => {
        if (props.pinned) {
            props.unpinApp && props.unpinApp()
        } else {
            props.pinApp && props.pinApp()
        }
    }

    return (
        <MenuSurface
            id="app-menu"
            active={props.active}
            onClose={props.onClose}
            className="cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm"
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
        </MenuSurface>
    )
}

export default AppMenu
