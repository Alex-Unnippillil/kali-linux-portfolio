import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function DockMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handleQuit = () => {
        props.onQuit && props.onQuit()
        props.onClose && props.onClose()
    }

    const handleHide = () => {
        props.onHide && props.onHide()
        props.onClose && props.onClose()
    }

    const handleNewWindow = () => {
        props.onNewWindow && props.onNewWindow()
        props.onClose && props.onClose()
    }

    const handleUnpin = () => {
        props.onUnpin && props.onUnpin()
        props.onClose && props.onClose()
    }

    return (
        <div
            id="dock-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleQuit}
                role="menuitem"
                aria-label="Quit"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Quit</span>
            </button>
            <button
                type="button"
                onClick={handleHide}
                role="menuitem"
                aria-label="Hide"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Hide</span>
            </button>
            <button
                type="button"
                onClick={handleNewWindow}
                role="menuitem"
                aria-label="New Window"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">New Window</span>
            </button>
            <Devider />
            <button
                type="button"
                onClick={handleUnpin}
                role="menuitem"
                aria-label="Unpin"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Unpin</span>
            </button>
        </div>
    )
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default DockMenu

