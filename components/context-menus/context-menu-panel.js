import React, { useEffect, useMemo, useRef, useState } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function buildGroups(groups = []) {
    if (!Array.isArray(groups)) return []
    return groups
        .map((group, index) => {
            if (!group || typeof group !== 'object') return null
            const items = Array.isArray(group.items) ? group.items.filter(Boolean) : []
            if (items.length === 0) return null
            return { ...group, items, key: group.id || `group-${index}` }
        })
        .filter(Boolean)
}

export default function ContextMenuPanel(props) {
    const {
        id,
        active = false,
        groups = [],
        onClose,
        anchorLabel,
        ariaLabel,
        style,
        className = '',
    } = props

    const menuRef = useRef(null)
    const [status, setStatus] = useState('')

    useFocusTrap(menuRef, active)
    useRovingTabIndex(menuRef, active, 'vertical')

    const memoizedGroups = useMemo(() => buildGroups(groups), [groups])

    useEffect(() => {
        if (!active) {
            setStatus('')
        }
    }, [active, anchorLabel])

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose && onClose()
        }
    }

    const handleSelect = (item) => {
        const feedback = typeof item.feedback === 'function'
            ? item.feedback({ anchor: anchorLabel, item })
            : item.feedback
        const message = feedback || `${item.label}${anchorLabel ? ` • ${anchorLabel}` : ''}`
        setStatus(message)
        if (typeof item.onSelect === 'function') {
            item.onSelect()
        }
        if (item.closeOnSelect) {
            onClose && onClose()
        }
    }

    return (
        <div
            id={id}
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            aria-hidden={!active}
            style={style}
            onKeyDown={handleKeyDown}
            className={(active ? ' block ' : ' hidden ') +
                ' cursor-default w-60 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm shadow-lg focus:outline-none ' +
                className}
        >
            {memoizedGroups.map((group, groupIndex) => (
                <div key={group.key} role="group" aria-label={group.label || undefined}>
                    {groupIndex > 0 && <MenuSeparator />}
                    {group.label && (
                        <div className="px-4 pb-1 text-xs uppercase tracking-wide text-gray-400" role="presentation">
                            {group.label}
                        </div>
                    )}
                    {group.items.map((item, itemIndex) => {
                        if (item.type === 'separator') {
                            return <MenuSeparator key={`sep-${group.key}-${itemIndex}`} />
                        }
                        const disabled = Boolean(item.disabled)
                        return (
                            <button
                                key={item.id || `${group.key}-${itemIndex}`}
                                type="button"
                                role="menuitem"
                                tabIndex={-1}
                                disabled={disabled}
                                onClick={() => !disabled && handleSelect(item)}
                                className={'w-full flex items-center gap-2 px-4 py-1.5 text-left rounded transition-colors ' +
                                    (disabled
                                        ? 'text-gray-500 cursor-not-allowed'
                                        : 'hover:bg-gray-700 focus:bg-gray-700 focus:outline-none')}
                            >
                                {item.icon && <span aria-hidden className="text-base leading-none">{item.icon}</span>}
                                <span className="flex-1">{item.label}</span>
                                {item.kbd && (
                                    <span className="text-xs text-gray-400" aria-hidden>
                                        {item.kbd}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            ))}
            <MenuSeparator />
            <div role="status" aria-live="polite" className="px-4 pt-1 text-xs text-gray-300 min-h-[1.5rem]">
                {status || 'Select an action'}
            </div>
        </div>
    )
}

function MenuSeparator() {
    return (
        <div role="separator" className="flex justify-center w-full py-1">
            <div className="border-t border-gray-900 w-3/4" />
        </div>
    )
}
