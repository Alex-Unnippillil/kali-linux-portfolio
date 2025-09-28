import React, { useEffect, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function DesktopMenu(props) {

    const menuRef = useRef(null)
    const visible = props.active && props.isDesktopTarget

    useFocusTrap(menuRef, visible)
    useRovingTabIndex(menuRef, visible, 'vertical')

    useEffect(() => {
        if (!visible) return
        const firstItem = menuRef.current?.querySelector('[role="menuitem"]')
        firstItem?.focus()
    }, [visible])

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const runAction = (fn) => () => {
        if (typeof fn === 'function') {
            fn()
        }
        props.onClose && props.onClose()
    }

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            aria-hidden={!visible}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(visible ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <button
                onClick={runAction(props.addNewFolder)}
                type="button"
                role="menuitem"
                aria-label="New Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">New Folder</span>
            </button>
            <button
                onClick={runAction(props.openShortcutSelector)}
                type="button"
                role="menuitem"
                aria-label="Create Shortcut"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Shortcut...</span>
            </button>
            <button
                onClick={runAction(props.arrangeIcons)}
                type="button"
                role="menuitem"
                aria-label="Arrange Desktop Icons"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Arrange Icons</span>
            </button>
            <button
                onClick={runAction(props.openBackgroundSettings)}
                type="button"
                role="menuitem"
                aria-label="Change Background"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20"
            >
                <span className="ml-5">Change Background...</span>
            </button>
        </div>
    )
}

export default DesktopMenu
