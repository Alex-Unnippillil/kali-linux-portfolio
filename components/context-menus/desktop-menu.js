import React, { useState, useEffect, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'
import logger from '../../utils/logger'

const ARRANGE_OPTIONS = [
    { value: 'name', label: 'Name' },
    { value: 'favorites', label: 'Favorites First' },
    { value: 'recent', label: 'Recently Used' },
]

function DesktopMenu(props) {
    const {
        active,
        onClose,
        onOpenTerminal,
        onCreateFolder,
        onCreateShortcut,
        onArrange,
        arrangement,
        onChangeBackground,
        onToggleFullScreen,
        isFullScreen,
        onClearSession,
    } = props

    const [fullScreen, setFullScreen] = useState(false)
    const [arrangeOpen, setArrangeOpen] = useState(false)
    const menuRef = useRef(null)
    const arrangeButtonRef = useRef(null)
    const submenuRef = useRef(null)

    useEffect(() => {
        const updateFullScreen = () => {
            setFullScreen(Boolean(document.fullscreenElement))
        }
        document.addEventListener('fullscreenchange', updateFullScreen)
        updateFullScreen()
        return () => {
            document.removeEventListener('fullscreenchange', updateFullScreen)
        }
    }, [])

    useFocusTrap(menuRef, active)
    useRovingTabIndex(menuRef, active, 'vertical')

    useEffect(() => {
        if (!active) {
            setArrangeOpen(false)
            return
        }
        const focusFirst = () => {
            const first = menuRef.current?.querySelector('[data-menu-item]')
            if (first instanceof HTMLElement) {
                first.focus()
            }
        }
        const id = window.requestAnimationFrame(focusFirst)
        return () => window.cancelAnimationFrame(id)
    }, [active])

    const closeMenu = () => {
        onClose && onClose()
    }

    const handleMenuKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            setArrangeOpen(false)
            closeMenu()
        }
        if (e.key === 'ArrowLeft' && arrangeOpen) {
            e.preventDefault()
            setArrangeOpen(false)
            arrangeButtonRef.current?.focus()
        }
    }

    const handleArrangeKeyDown = (e) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setArrangeOpen(true)
        } else if (e.key === 'ArrowLeft' && arrangeOpen) {
            e.preventDefault()
            setArrangeOpen(false)
        }
    }

    const handleSubmenuKeyDown = (e) => {
        const items = submenuRef.current
            ? Array.from(submenuRef.current.querySelectorAll('button[role="menuitemradio"]'))
            : []
        const currentIndex = items.findIndex((item) => item === document.activeElement)
        if (e.key === 'Escape' || e.key === 'ArrowLeft') {
            e.preventDefault()
            setArrangeOpen(false)
            arrangeButtonRef.current?.focus()
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (items.length === 0) return
            const next = items[(currentIndex + 1) % items.length]
            next?.focus()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (items.length === 0) return
            const next = items[(currentIndex - 1 + items.length) % items.length]
            next?.focus()
        }
    }

    useEffect(() => {
        if (!arrangeOpen) return
        const first = submenuRef.current?.querySelector('button[role="menuitemradio"]')
        if (first instanceof HTMLElement) {
            first.focus()
        }
    }, [arrangeOpen])

    const handleToggleFullScreen = async () => {
        try {
            if (typeof onToggleFullScreen === 'function') {
                await onToggleFullScreen()
            } else if (document.fullscreenElement) {
                await document.exitFullscreen()
            } else {
                await document.documentElement.requestFullscreen()
            }
        } catch (error) {
            logger.error(error)
        }
    }

    const handleArrangeSelect = (mode) => {
        if (typeof onArrange === 'function') {
            onArrange(mode)
        }
        setArrangeOpen(false)
        closeMenu()
    }

    const callAndClose = (fn) => () => {
        if (typeof fn === 'function') {
            fn()
        }
        closeMenu()
    }

    const showFullScreen = typeof isFullScreen === 'boolean' ? isFullScreen : fullScreen

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label="Desktop context menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleMenuKeyDown}
            className={(active ? ' block ' : ' hidden ') + ' cursor-default w-56 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm shadow-lg'}
        >
            <MenuButton
                label="Open Terminal Here"
                onClick={callAndClose(onOpenTerminal)}
            />
            <MenuButton
                label="Create Folder"
                onClick={callAndClose(onCreateFolder)}
            />
            {typeof onCreateShortcut === 'function' && (
                <MenuButton
                    label="Create Shortcut..."
                    onClick={callAndClose(onCreateShortcut)}
                />
            )}
            <div className="relative">
                <button
                    type="button"
                    role="menuitem"
                    ref={arrangeButtonRef}
                    aria-haspopup="true"
                    aria-expanded={arrangeOpen}
                    data-menu-item
                    className="w-full text-left py-0.5 px-5 hover:bg-ub-warm-grey hover:bg-opacity-20 flex items-center justify-between"
                    onClick={() => setArrangeOpen((open) => !open)}
                    onKeyDown={handleArrangeKeyDown}
                >
                    <span>Arrange Icons by…</span>
                    <span aria-hidden="true" className="ml-2">▸</span>
                </button>
                <div
                    role="menu"
                    aria-label="Arrange icons by"
                    aria-hidden={!arrangeOpen}
                    ref={submenuRef}
                    className={(arrangeOpen ? ' block ' : ' hidden ') + ' absolute top-0 left-full ml-1 w-48 context-menu-bg border border-gray-900 rounded shadow-lg py-2'}
                    onKeyDown={handleSubmenuKeyDown}
                >
                    {ARRANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={arrangement === option.value}
                            tabIndex={arrangeOpen ? 0 : -1}
                            className="w-full text-left px-5 py-1 hover:bg-ub-warm-grey hover:bg-opacity-20 flex items-center justify-between"
                            onClick={() => handleArrangeSelect(option.value)}
                        >
                            <span>{option.label}</span>
                            {arrangement === option.value && <span aria-hidden="true">✓</span>}
                        </button>
                    ))}
                </div>
            </div>
            <MenuButton
                label="Change Desktop Background"
                onClick={callAndClose(onChangeBackground)}
            />
            <Divider />
            <MenuButton
                label={`${showFullScreen ? 'Exit' : 'Enter'} Full Screen`}
                onClick={callAndClose(handleToggleFullScreen)}
            />
            <MenuButton
                label="Clear Session"
                onClick={callAndClose(onClearSession)}
            />
        </div>
    )
}

function MenuButton({ label, onClick }) {
    return (
        <button
            type="button"
            role="menuitem"
            data-menu-item
            className="w-full text-left py-0.5 px-5 hover:bg-ub-warm-grey hover:bg-opacity-20"
            onClick={onClick}
        >
            {label}
        </button>
    )
}

function Divider() {
    return (
        <div className="flex justify-center w-full my-1">
            <div className="border-t border-gray-900 w-4/5" aria-hidden="true"></div>
        </div>
    )
}

export default DesktopMenu
