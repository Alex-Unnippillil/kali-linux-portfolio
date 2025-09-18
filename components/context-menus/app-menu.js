import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

const interactiveItemClasses = 'w-full text-left cursor-default py-0.5 mb-1.5 transition-hover transition-active hover:bg-[var(--interactive-hover)] focus:bg-[var(--interactive-hover)] focus-visible:bg-[var(--interactive-hover)] active:bg-[var(--interactive-active)]'

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
            className={`${props.active ? 'block' : 'hidden'} cursor-default w-52 context-menu-bg border text-left border-[color:var(--color-border)] text-[color:var(--color-text)] py-4 absolute z-50 text-sm`}
        >
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className={interactiveItemClasses}
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

export default AppMenu
