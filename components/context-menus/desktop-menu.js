import React, { useEffect, useRef, useState } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'
import logger from '../../utils/logger'

function DesktopMenu(props) {
    const [isFullScreen, setIsFullScreen] = useState(false)
    const menuRef = useRef(null)
    const iconSizePreset = props.iconSizePreset || 'medium'
    const setIconSizePreset = typeof props.setIconSizePreset === 'function' ? props.setIconSizePreset : () => { }
    const sortOrder = props.sortOrder || 'manual'

    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    useEffect(() => {
        const handleChange = () => {
            if (document.fullscreenElement) {
                setIsFullScreen(true)
            } else {
                setIsFullScreen(false)
            }
        }

        document.addEventListener('fullscreenchange', handleChange)
        handleChange()
        return () => {
            document.removeEventListener('fullscreenchange', handleChange)
        }
    }, [])

    const iconSizeOptions = [
        { value: 'small', label: 'Small Icons' },
        { value: 'medium', label: 'Medium Icons' },
        { value: 'large', label: 'Large Icons' },
    ]

    const sortOptions = [
        { value: 'manual', label: 'Manual order' },
        { value: 'name-asc', label: 'Name (A to Z)' },
        { value: 'name-desc', label: 'Name (Z to A)' },
    ]

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            if (props.onClose) props.onClose()
        }
    }

    const handleAction = (callback, { closeMenu = true } = {}) => () => {
        if (typeof callback === 'function') {
            callback()
        }
        if (closeMenu && props.onClose) {
            props.onClose()
        }
    }

    const handleSortSelect = (value) => {
        if (typeof props.onSortChange === 'function') {
            props.onSortChange(value)
        }
    }

    const goFullScreen = () => {
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                document.documentElement.requestFullscreen()
            }
        }
        catch (e) {
            logger.error(e)
        }
    }

    return (
        <div
            id="desktop-menu"
            ref={menuRef}
            role="menu"
            aria-hidden={!props.active}
            aria-label="Desktop context menu"
            onKeyDown={handleKeyDown}
            className={(props.active ? " block " : " hidden ") + " cursor-default w-60 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <SectionLabel>New</SectionLabel>
            <button
                onClick={handleAction(props.addNewFolder)}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">New Folder</span>
            </button>
            <button
                onClick={handleAction(props.openShortcutSelector)}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">Create Shortcut...</span>
            </button>
            <Divider />
            <SectionLabel>View</SectionLabel>
            {iconSizeOptions.map((option) => {
                const isActive = iconSizePreset === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => setIconSizePreset(option.value)}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        className={(isActive ? " text-ubt-blue " : "") + " group w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"}
                    >
                        <span className="ml-5">{option.label}</span>
                        <span
                            aria-hidden="true"
                            className={(isActive ? " opacity-100 " : " opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60 ") + " mr-5 text-xs transition-opacity"}
                        >
                            ✓
                        </span>
                    </button>
                )
            })}
            <Divider />
            <SectionLabel>Sort</SectionLabel>
            {sortOptions.map((option) => {
                const isActive = sortOrder === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => handleSortSelect(option.value)}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        className={(isActive ? " text-ubt-blue " : "") + " group w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"}
                    >
                        <span className="ml-5">{option.label}</span>
                        <span
                            aria-hidden="true"
                            className={(isActive ? " opacity-100 " : " opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60 ") + " mr-5 text-xs transition-opacity"}
                        >
                            ✓
                        </span>
                    </button>
                )
            })}
            <Divider />
            <button
                type="button"
                role="menuitem"
                aria-disabled="true"
                disabled
                data-roving-disabled="true"
                className="w-full text-left py-0.5 mb-1.5 text-gray-400 cursor-not-allowed"
            >
                <span className="ml-5">Paste</span>
            </button>
            <Divider />
            <button
                type="button"
                role="menuitem"
                aria-disabled="true"
                disabled
                data-roving-disabled="true"
                className="w-full text-left py-0.5 mb-1.5 text-gray-400 cursor-not-allowed"
            >
                <span className="ml-5">Show Desktop in Files</span>
            </button>
            <button
                onClick={handleAction(() => props.openApp("terminal"))}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">Open in Terminal</span>
            </button>
            <Divider />
            <button
                onClick={handleAction(() => props.openApp("settings"))}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">Change Background...</span>
            </button>
            <Divider />
            <button
                type="button"
                role="menuitem"
                aria-disabled="true"
                disabled
                data-roving-disabled="true"
                className="w-full text-left py-0.5 mb-1.5 text-gray-400 cursor-not-allowed"
            >
                <span className="ml-5">Display Settings</span>
            </button>
            <button
                onClick={handleAction(() => props.openApp("settings"))}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">Settings</span>
            </button>
            <Divider />
            <button
                onClick={handleAction(goFullScreen)}
                type="button"
                role="menuitem"
                aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">{isFullScreen ? "Exit" : "Enter"} Full Screen</span>
            </button>
            <Divider />
            <button
                onClick={handleAction(props.clearSession)}
                type="button"
                role="menuitem"
                className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 focus-visible:outline-none focus-visible:bg-ub-warm-grey focus-visible:bg-opacity-30"
            >
                <span className="ml-5">Clear Session</span>
            </button>
        </div>
    )
}

function SectionLabel({ children }) {
    return (
        <div className="px-5 pb-1 text-xs tracking-wide uppercase text-ub-warm-grey text-opacity-80">
            {children}
        </div>
    )
}

function Divider() {
    return (
        <div className="flex justify-center w-full" role="separator" aria-hidden="true">
            <div className="border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    )
}

export default DesktopMenu
