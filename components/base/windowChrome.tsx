// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './window.module.css';

export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown, onDoubleClick, controls }) {
    return (
        <div
            className={`${styles.windowTitlebar} bg-ub-window-title text-white select-none`}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
            data-window-titlebar=""
            data-window-drag-handle=""
        >
            <span className={styles.windowTitleBalancer} aria-hidden="true" />
            <div className={`${styles.windowTitle} text-sm font-bold`} title={title}>
                {title}
            </div>
            {controls}
        </div>
    );
}

const edgeDirectionClassMap: Record<string, string> = {
    n: styles.windowResizeHandleNorth,
    s: styles.windowResizeHandleSouth,
    e: styles.windowResizeHandleEast,
    w: styles.windowResizeHandleWest,
};

const cornerDirectionClassMap: Record<string, string> = {
    nw: styles.windowResizeHandleCornerNorthWest,
    ne: styles.windowResizeHandleCornerNorthEast,
    se: styles.windowResizeHandleCornerSouthEast,
    sw: styles.windowResizeHandleCornerSouthWest,
};

export function WindowEdgeHandle({ direction, onResizeStart, active }) {
    const handlePointerDown = useCallback((event) => {
        if (typeof onResizeStart === 'function') {
            onResizeStart(direction, event);
        }
    }, [direction, onResizeStart]);

    const classes = [
        styles.windowResizeHandle,
        styles.windowResizeHandleEdge,
        edgeDirectionClassMap[direction] || '',
        active ? styles.windowResizeHandleActive : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            role="presentation"
            aria-hidden="true"
            tabIndex={-1}
            className={classes}
            data-resize-handle="edge"
            data-resize-direction={direction}
            onPointerDown={handlePointerDown}
        />
    );
}

export function WindowCornerHandle({ direction, onResizeStart, active }) {
    const handlePointerDown = useCallback((event) => {
        if (typeof onResizeStart === 'function') {
            onResizeStart(direction, event);
        }
    }, [direction, onResizeStart]);

    const classes = [
        styles.windowResizeHandle,
        styles.windowResizeHandleCorner,
        cornerDirectionClassMap[direction] || '',
        active ? styles.windowResizeHandleActive : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            role="presentation"
            aria-hidden="true"
            tabIndex={-1}
            className={classes}
            data-resize-handle="corner"
            data-resize-direction={direction}
            onPointerDown={handlePointerDown}
        />
    );
}

export function WindowEditButtons(props) {
    const allowMaximize = props.allowMaximize !== false;
    const isMaximized = Boolean(props.isMaximised);
    const minimizeAriaLabel = 'Window minimize';
    const maximizeAriaLabel = isMaximized ? 'Restore window size' : 'Window maximize';
    const closeAriaLabel = 'Window close';
    const controlsRef = useRef<HTMLDivElement | null>(null);
    const [pressedControl, setPressedControl] = useState<string | null>(null);
    const pointerActiveRef = useRef<string | null>(null);

    useEffect(() => {
        const node = controlsRef.current;
        if (typeof window === 'undefined' || !node) {
            return undefined;
        }

        const titlebar = node.closest('[data-window-titlebar]');
        if (!titlebar) {
            return undefined;
        }

        const setWidth = () => {
            titlebar.style.setProperty('--window-controls-width', `${node.offsetWidth}px`);
        };

        setWidth();

        if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(() => setWidth());
            observer.observe(node);
            return () => {
                observer.disconnect();
                titlebar.style.removeProperty('--window-controls-width');
            };
        }

        const handleResize = () => setWidth();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            titlebar.style.removeProperty('--window-controls-width');
        };
    }, []);

    const iconProps = {
        className: styles.windowControlIcon,
        viewBox: '0 0 16 16',
        'aria-hidden': true,
        focusable: 'false',
    } as const;

    const MinimizeIcon = () => (
        <svg {...iconProps}>
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    const MaximizeIcon = () => (
        <svg {...iconProps}>
            <rect
                x="3"
                y="3"
                width="10"
                height="10"
                rx="1.6"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
            />
        </svg>
    );

    const RestoreIcon = () => (
        <svg {...iconProps}>
            <rect
                x="5"
                y="3"
                width="8"
                height="6.5"
                rx="1.4"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
            />
            <rect
                x="3"
                y="6.5"
                width="8"
                height="6.5"
                rx="1.4"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
            />
        </svg>
    );

    const CloseIcon = () => (
        <svg {...iconProps}>
            <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    const resetPressedControl = useCallback(() => {
        pointerActiveRef.current = null;
        setPressedControl(null);
    }, []);

    const handleMaximize = (event: React.PointerEvent | React.MouseEvent | React.KeyboardEvent | undefined) => {
        if (!allowMaximize) {
            event?.preventDefault?.();
            return;
        }
        if (typeof props.maximize === 'function') {
            props.maximize(event);
        }
    };

    const handlePointerDown = useCallback((control: string) => (event: any) => {
        event.stopPropagation();
        pointerActiveRef.current = 'pointer';
        if (typeof event.pointerId === 'number' && typeof event.currentTarget?.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        setPressedControl(control);
    }, []);

    const handlePointerUp = useCallback((control: string, handler?: (event: any) => void) => (event: any) => {
        event.stopPropagation();
        if (typeof event.pointerId === 'number'
            && typeof event.currentTarget?.releasePointerCapture === 'function'
            && (!event.currentTarget.hasPointerCapture
                || event.currentTarget.hasPointerCapture(event.pointerId))) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setPressedControl((current) => (current === control ? null : current));
        pointerActiveRef.current = 'pointer-handled';
        if (typeof handler === 'function') {
            handler(event);
        }
    }, []);

    const handleButtonClick = useCallback((handler?: (event: any) => void) => (event: any) => {
        if (pointerActiveRef.current === 'pointer' || pointerActiveRef.current === 'pointer-handled') {
            pointerActiveRef.current = null;
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if (typeof handler === 'function') {
            handler(event);
        }
    }, []);

    return (
        <div
            ref={controlsRef}
            className={styles.windowControls}
            role="group"
            aria-label="Window controls"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            data-window-controls=""
        >
            <button
                type="button"
                aria-label={minimizeAriaLabel}
                title="Minimize"
                className={`${styles.windowControlButton} ${pressedControl === 'minimize' ? styles.windowControlButtonPressed : ''}`.trim()}
                onPointerDown={handlePointerDown('minimize')}
                onPointerUp={handlePointerUp('minimize', props.minimize)}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
                onClick={handleButtonClick(props.minimize)}
            >
                <MinimizeIcon />
            </button>
            <button
                type="button"
                aria-label={maximizeAriaLabel}
                title={isMaximized ? 'Restore' : 'Maximize'}
                className={[
                    styles.windowControlButton,
                    allowMaximize ? '' : styles.windowControlButtonDisabled,
                    pressedControl === 'maximize' ? styles.windowControlButtonPressed : '',
                ].filter(Boolean).join(' ')}
                onClick={handleButtonClick(handleMaximize)}
                disabled={!allowMaximize}
                aria-disabled={!allowMaximize}
                onPointerDown={allowMaximize ? handlePointerDown('maximize') : undefined}
                onPointerUp={allowMaximize ? handlePointerUp('maximize', handleMaximize) : undefined}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
            >
                {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
            <button
                type="button"
                id={`close-${props.id}`}
                aria-label={closeAriaLabel}
                title="Close"
                className={[styles.windowControlButton, styles.windowControlButtonClose, pressedControl === 'close' ? styles.windowControlButtonPressed : ''].filter(Boolean).join(' ')}
                onPointerDown={handlePointerDown('close')}
                onPointerUp={handlePointerUp('close', props.close)}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
                onClick={handleButtonClick(props.close)}
            >
                <CloseIcon />
            </button>
        </div>
    );
}
