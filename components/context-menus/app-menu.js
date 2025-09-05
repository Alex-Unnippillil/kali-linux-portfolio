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

    const handleSend = (fn) => {
        fn && fn()
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
            <div className="w-full text-left py-0.5 mb-1.5 text-gray-400">
                <span className="ml-5">Send To</span>
            </div>
            <button
                type="button"
                onClick={() => handleSend(props.sendToDesktop)}
                role="menuitem"
                aria-label="Send to Desktop"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Desktop (Create Link)</span>
            </button>
            <button
                type="button"
                onClick={() => handleSend(props.sendToEmail)}
                role="menuitem"
                aria-label="Send via Email"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Email (mock)</span>
            </button>
            <button
                type="button"
                onClick={() => handleSend(props.sendToArchive)}
                role="menuitem"
                aria-label="Send to Archive"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Archive</span>
            </button>
            <button
                type="button"
                onClick={() => handleSend(props.sendToTrash)}
                role="menuitem"
                aria-label="Send to Trash"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Trash</span>
            </button>
            <Devider />
            <button
                type="button"
                onClick={handlePin}
                role="menuitem"
                aria-label={props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites'}</span>
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

export default AppMenu
