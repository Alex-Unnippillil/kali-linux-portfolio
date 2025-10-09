import React, { useCallback, useImperativeHandle, useRef, useState } from 'react'
import Image from 'next/image'

export const UbuntuApp = React.forwardRef(function UbuntuApp(props, forwardedRef) {
    const {
        draggable = true,
        isBeingDragged = false,
        onPointerDown,
        onPointerMove,
        onPointerCancel,
        onPointerUp,
        onKeyDown,
        prefetch,
        disabled,
        name,
        id,
        icon,
        openApp: triggerOpen,
        displayName,
        style,
    } = props

    const [launching, setLaunching] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [prefetched, setPrefetched] = useState(false)
    const nodeRef = useRef(null)

    useImperativeHandle(forwardedRef, () => nodeRef.current)

    const handleDragStart = useCallback(() => {
        setDragging(true)
    }, [])

    const handleDragEnd = useCallback(() => {
        setDragging(false)
    }, [])

    const openApp = useCallback(() => {
        if (disabled) return
        setLaunching(true)
        setTimeout(() => setLaunching(false), 300)
        triggerOpen(id)
    }, [disabled, triggerOpen, id])

    const handlePrefetch = useCallback(() => {
        if (!prefetched && typeof prefetch === 'function') {
            prefetch()
            setPrefetched(true)
        }
    }, [prefetched, prefetch])

    const handleActivate = useCallback((event) => {
        if (disabled) return

        const currentlyDragging = dragging || isBeingDragged
        if (currentlyDragging) return

        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault()
        }

        openApp()
    }, [disabled, dragging, isBeingDragged, openApp])

    const handlePointerUp = useCallback((event) => {
        if (typeof onPointerUp === 'function') {
            onPointerUp(event)
        }

        if (event?.defaultPrevented) return

        if (event?.pointerType === 'touch') {
            handleActivate(event)
        }
    }, [handleActivate, onPointerUp])

    const handleKeyDown = useCallback((event) => {
        if (typeof onKeyDown === 'function') {
            const handled = onKeyDown(event)
            if (handled) {
                return
            }
        }

        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault()
            openApp()
        }
    }, [disabled, onKeyDown, openApp])

    const combinedStyle = {
        width: 'var(--desktop-icon-width, 6rem)',
        minWidth: 'var(--desktop-icon-width, 6rem)',
        height: 'var(--desktop-icon-height, 5.5rem)',
        minHeight: 'var(--desktop-icon-height, 5.5rem)',
        padding: 'var(--desktop-icon-padding, 0.25rem)',
        fontSize: 'var(--desktop-icon-font-size, 0.75rem)',
        gap: 'var(--desktop-icon-gap, 0.375rem)',
        ...style,
    }

    const combinedClassName =
        `${launching ? ' app-icon-launch ' : ''}` +
        `${dragging || isBeingDragged ? ' opacity-70 ' : ''}` +
        ' m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active '

    return (
        <div
            ref={nodeRef}
            role="button"
            aria-label={name}
            aria-disabled={disabled}
            data-context="app"
            data-app-id={id}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={onPointerCancel}
            style={combinedStyle}
            className={combinedClassName}
            id={`app-${id}`}
            onDoubleClick={openApp}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
        >
            <Image
                width={48}
                height={48}
                className="mb-1"
                style={{
                    width: 'var(--desktop-icon-image, 2.5rem)',
                    height: 'var(--desktop-icon-image, 2.5rem)'
                }}
                src={icon.replace('./', '/')}
                alt={`Kali ${name}`}
                sizes="(max-width: 768px) 48px, 64px"
            />
            {displayName || name}
        </div>
    )
})

export default UbuntuApp
