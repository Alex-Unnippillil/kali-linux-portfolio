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
                onClick={() => {
                    if (props.isFavorite) {
                        props.onRemoveFavorite && props.onRemoveFavorite()
                    } else {
                        props.onAddFavorite && props.onAddFavorite()
                    }
                }}
                role="menuitem"
                aria-label={props.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
            <button
                type="button"
                onClick={() => {
                    if (props.pinned) {
                        props.unpinApp && props.unpinApp()
                    } else {
                        props.pinApp && props.pinApp()
                    }
                }}
                role="menuitem"
                aria-label={props.pinned ? 'Remove from Panel' : 'Add to Panel'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.pinned ? 'Remove from Panel' : 'Add to Panel'}</span>
            </button>
            <button
                type="button"
                onClick={() => {
                    if (props.onDesktop) {
                        props.onRemoveDesktop && props.onRemoveDesktop()
                    } else {
                        props.onAddDesktop && props.onAddDesktop()
                    }
                }}
                role="menuitem"
                aria-label={props.onDesktop ? 'Remove from Desktop' : 'Add to Desktop'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
            >
                <span className="ml-5">{props.onDesktop ? 'Remove from Desktop' : 'Add to Desktop'}</span>
            </button>
        </div>
    )
}

export default AppMenu
