import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function WindowMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu()
        }
    }

    const handleAction = (callback) => () => {
        if (typeof callback === 'function') {
            callback()
        }
        props.onCloseMenu && props.onCloseMenu()
    }

    const renderItem = (label, ariaLabel, onClick, disabled = false) => {
        const keyValue = `${ariaLabel}-${label}`
        if (disabled) {
            return (
                <div
                    key={keyValue}
                    role="menuitem"
                    aria-disabled="true"
                    className="w-full py-0.5 hover:bg-gray-700 mb-1.5 text-gray-400"
                >
                    <span className="ml-5">{label}</span>
                </div>
            )
        }

        return (
            <button
                key={keyValue}
                type="button"
                onClick={handleAction(onClick)}
                role="menuitem"
                aria-label={ariaLabel}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{label}</span>
            </button>
        )
    }

    return (
        <div
            id="window-menu"
            role="menu"
            aria-label="Window context menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            {renderItem('Move', 'Move Window', props.onMove, !props.canMove)}
            {renderItem('Resize', 'Resize Window', props.onResize, !props.canResize)}
            <Divider />
            {renderItem(props.isMinimized ? 'Restore' : 'Minimize', props.isMinimized ? 'Restore Window' : 'Minimize Window', props.onMinimize)}
            {props.allowMaximize !== false && renderItem(props.isMaximized ? 'Restore' : 'Maximize', props.isMaximized ? 'Restore Window' : 'Maximize Window', props.onMaximize)}
            {props.snapEnabled && (
                <>
                    <Divider />
                    {renderItem(props.snapped === 'left' ? 'Unsnap from Left' : 'Snap Left', props.snapped === 'left' ? 'Unsnap Window from Left' : 'Snap Window Left', props.onSnapLeft, !props.canSnapLeft)}
                    {renderItem(props.snapped === 'right' ? 'Unsnap from Right' : 'Snap Right', props.snapped === 'right' ? 'Unsnap Window from Right' : 'Snap Window Right', props.onSnapRight, !props.canSnapRight)}
                </>
            )}
            <Divider />
            {renderItem('Close', 'Close Window', props.onClose)}
        </div>
    )
}

function Divider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    )
}

export default WindowMenu
