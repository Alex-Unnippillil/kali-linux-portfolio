import React, { useEffect, useRef } from 'react'
import useMenuFocusManagement from '../../hooks/useMenuFocusManagement'

function AppMenu(props) {
    const { active, onClose, pinned, pinApp, unpinApp, restoreFocusRef } = props
    const menuRef = useRef(null)
    useMenuFocusManagement({
        containerRef: menuRef,
        active,
        orientation: 'vertical',
        restoreFocusRef,
    })

    useEffect(() => {
        if (!active) {
            return undefined
        }

        const handlePointer = (event) => {
            if (!menuRef.current || menuRef.current.contains(event.target)) {
                return
            }
            onClose && onClose()
        }

        const handleKey = (event) => {
            if (event.key !== 'Escape') {
                return
            }
            event.preventDefault()
            onClose && onClose()
        }

        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('keydown', handleKey)

        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('keydown', handleKey)
        }
    }, [active, onClose])

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose && onClose()
        }
    }

    const handlePin = () => {
        if (pinned) {
            unpinApp && unpinApp()
        } else {
            pinApp && pinApp()
        }
    }

    return (
        <div
            id="app-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

export default AppMenu
