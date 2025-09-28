import React, { forwardRef, useEffect, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

const SidebarAppMenu = forwardRef(function SidebarAppMenu(props, forwardedRef) {
    const { active, position, pinned, onClose, onToggleFavourite, onOpenInNewWorkspace } = props
    const menuRef = useRef(null)

    useFocusTrap(menuRef, active)
    useRovingTabIndex(menuRef, active, 'vertical')

    useEffect(() => {
        if (!forwardedRef) return
        if (typeof forwardedRef === 'function') {
            forwardedRef(menuRef.current)
        } else {
            forwardedRef.current = menuRef.current
        }
    }, [forwardedRef, active])

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose && onClose()
        }
    }

    const style = {
        top: `${position?.y ?? 0}px`,
        left: `${position?.x ?? 0}px`,
    }

    const favouriteLabel = pinned ? 'Unpin from Favorites' : 'Pin to Favorites'

    return (
        <div
            id="sidebar-app-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={(active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm'}
            style={style}
        >
            <button
                type="button"
                onClick={onToggleFavourite}
                role="menuitem"
                aria-label={favouriteLabel}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 px-4"
            >
                {favouriteLabel}
            </button>
            <button
                type="button"
                onClick={onOpenInNewWorkspace}
                role="menuitem"
                aria-label="Open in New Workspace"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 px-4"
            >
                Open in New Workspace
            </button>
        </div>
    )
})

export default SidebarAppMenu
