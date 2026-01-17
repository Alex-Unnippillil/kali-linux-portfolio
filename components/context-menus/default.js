import React, { useCallback, useEffect, useRef, useState } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'
import logger from '../../utils/logger'

function DefaultMenu(props) {
    const menuRef = useRef(null)
    const [isFullScreen, setIsFullScreen] = useState(() => {
        if (typeof document === 'undefined') {
            return false
        }
        return Boolean(document.fullscreenElement)
    })

    const checkFullScreen = useCallback(() => {
        if (typeof document === 'undefined') {
            return
        }
        setIsFullScreen(Boolean(document.fullscreenElement))
    }, [])

    const runAndClose = (action) => {
        if (typeof action === 'function') {
            action()
        }
        if (props.onClose) {
            props.onClose()
        }
    }

    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    useEffect(() => {
        if (typeof document === 'undefined') {
            return
        }

        document.addEventListener('fullscreenchange', checkFullScreen)
        return () => {
            document.removeEventListener('fullscreenchange', checkFullScreen)
        }
    }, [checkFullScreen])

    const openTerminal = () => {
        runAndClose(() => {
            if (typeof props.openApp === 'function') {
                props.openApp('terminal')
            }
        })
    }

    const openSettings = () => {
        runAndClose(() => {
            if (typeof props.openApp === 'function') {
                props.openApp('settings')
            }
        })
    }

    const goFullScreen = () => {
        runAndClose(() => {
            if (typeof document === 'undefined') {
                return
            }

            try {
                if (document.fullscreenElement) {
                    document.exitFullscreen()
                } else {
                    document.documentElement.requestFullscreen()
                }
            } catch (e) {
                logger.error(e)
            }
        })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handleClearSession = () => {
        runAndClose(() => {
            if (typeof props.clearSession === 'function') {
                props.clearSession()
            }
        })
    }

    const handleNewFolder = () => {
        runAndClose(() => {
            if (typeof props.addNewFolder === 'function') {
                props.addNewFolder()
            }
        })
    }

    const handleCreateShortcut = () => {
        runAndClose(() => {
            if (typeof props.openShortcutSelector === 'function') {
                props.openShortcutSelector()
            }
        })
    }

    return (
        <div
            id="default-menu"
            role="menu"
            aria-label="Default context menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                onClick={handleNewFolder}
                type="button"
                role="menuitem"
                aria-label="New Folder"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">New Folder</span>
            </button>
            <button
                onClick={handleCreateShortcut}
                type="button"
                role="menuitem"
                aria-label="Create Shortcut"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Create Shortcut...</span>
            </button>
            <Devider />
            <div role="menuitem" aria-label="Paste" aria-disabled="true" className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400">
                <span className="ml-5">Paste</span>
            </div>
            <Devider />
            <button
                onClick={openTerminal}
                type="button"
                role="menuitem"
                aria-label="Open in Terminal"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Open in Terminal</span>
            </button>
            <Devider />
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Change Background"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Change Background...</span>
            </button>
            <button
                onClick={openSettings}
                type="button"
                role="menuitem"
                aria-label="Settings"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Settings</span>
            </button>
            <Devider />
            <button
                onClick={goFullScreen}
                type="button"
                role="menuitem"
                aria-label={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{isFullScreen ? 'Exit' : 'Enter'} Full Screen</span>
            </button>
            <Devider />
            <button
                onClick={handleClearSession}
                type="button"
                role="menuitem"
                aria-label="Clear Session"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">Clear Session</span>
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

export default DefaultMenu
