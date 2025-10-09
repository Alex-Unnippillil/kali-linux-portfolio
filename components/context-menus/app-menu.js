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

    const selectionCount = props.selectionCount || 0
    const hasSelection = selectionCount > 0
    const multipleSelection = selectionCount > 1

    const showOpenSelected = hasSelection && typeof props.onOpenSelected === 'function'
    const showMoveSelected = hasSelection && typeof props.onMoveSelected === 'function'
    const showDeleteSelected = hasSelection && typeof props.onDeleteSelected === 'function'
    const showPinOption = selectionCount <= 1

    const openLabel = multipleSelection ? `Open ${selectionCount} Items` : 'Open'
    const moveLabel = multipleSelection ? 'Move Selected Icons' : 'Move Icon'
    const deleteLabel = multipleSelection ? 'Remove Shortcuts' : 'Remove Shortcut'

    const handleOpenSelected = () => {
        if (!showOpenSelected) return
        props.onOpenSelected()
        props.onClose && props.onClose()
    }

    const handleMoveSelected = () => {
        if (!showMoveSelected) return
        props.onMoveSelected()
        props.onClose && props.onClose()
    }

    const handleDeleteSelected = () => {
        if (!showDeleteSelected) return
        props.onDeleteSelected()
        props.onClose && props.onClose()
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
            {showOpenSelected && (
                <button
                    type="button"
                    onClick={handleOpenSelected}
                    role="menuitem"
                    aria-label={openLabel}
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">{openLabel}</span>
                </button>
            )}
            {showMoveSelected && (
                <button
                    type="button"
                    onClick={handleMoveSelected}
                    role="menuitem"
                    aria-label={moveLabel}
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">{moveLabel}</span>
                </button>
            )}
            {showDeleteSelected && (
                <button
                    type="button"
                    onClick={handleDeleteSelected}
                    role="menuitem"
                    aria-label={deleteLabel}
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">{deleteLabel}</span>
                </button>
            )}
            {(showOpenSelected || showMoveSelected || showDeleteSelected) && showPinOption && <Divider />}
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className={(showPinOption ? '' : ' hidden ') + ' w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5'}
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
            </button>
        </div>
    )
}

function Divider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default AppMenu
