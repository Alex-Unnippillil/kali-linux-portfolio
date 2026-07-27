import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function DefaultMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handleClearSession = () => {
        localStorage.clear()
        window.location.reload()
    }

    const renderItem = (item, index) => {
        if (item.type === 'divider') {
            return <Divider key={`divider-${index}`} />
        }

        const commonProps = {
            key: `${item.label}-${index}`,
            role: 'menuitem',
            onClick: item.onClick,
            className:
                'w-full flex items-center justify-between px-5 py-1.5 text-left cursor-default hover:bg-gray-700 transition-colors',
        }

        const content = (
            <>
                <span className="font-medium tracking-wide">{item.label}</span>
                {item.secondary && (
                    <span className="ml-4 text-xs text-cyan-300 uppercase tracking-widest">{item.secondary}</span>
                )}
                {item.active && <span aria-hidden="true">✓</span>}
            </>
        )

        if (item.href) {
            return (
                <a
                    {...commonProps}
                    href={item.href}
                    target={item.target}
                    rel={item.rel}
                    aria-label={item.label}
                >
                    {content}
                </a>
            )
        }

        return (
            <button {...commonProps} type="button" aria-label={item.label}>
                {content}
            </button>
        )
    }

    const menuStructure = [
        { type: 'item', label: 'New Folder' },
        { type: 'item', label: 'Create Shortcut…' },
        { type: 'divider' },
        { type: 'item', label: 'Small Icons' },
        { type: 'item', label: 'Medium Icons', active: true },
        { type: 'item', label: 'Large Icons' },
        { type: 'divider' },
        { type: 'item', label: 'Paste' },
        { type: 'item', label: 'Show Desktop in Files' },
        { type: 'item', label: 'Open in Terminal' },
        { type: 'item', label: 'Change Background…' },
        { type: 'item', label: 'Display Settings' },
        { type: 'item', label: 'Settings' },
        { type: 'item', label: 'Enter Full Screen' },
        { type: 'item', label: 'Clear Session', onClick: handleClearSession },
    ]

    return (
        <div
            id="default-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-60 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm shadow-lg'}
        >
            {menuStructure.map((item, index) => renderItem(item, index))}
        </div>
    )
}

function Divider() {
    return <div className="border-t border-gray-900 my-1.5 mx-4" />
}

export default DefaultMenu
