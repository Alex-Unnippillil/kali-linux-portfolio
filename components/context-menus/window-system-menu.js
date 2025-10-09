import React, { useEffect, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowSystemMenu({
    open,
    position,
    onClose,
    onMove,
    onResize,
    onMinimize,
    onToggleMaximize,
    onCloseWindow,
    isMaximized,
    allowMaximize,
}) {
    const menuRef = useRef(null);

    useFocusTrap(menuRef, open);
    useRovingTabIndex(menuRef, open, 'vertical');

    useEffect(() => {
        if (open) {
            const firstItem = menuRef.current?.querySelector('[role="menuitem"]');
            firstItem?.focus();
        }
    }, [open]);

    useEffect(() => {
        const eventName = open ? 'context-menu-open' : 'context-menu-close';
        window.dispatchEvent(new CustomEvent(eventName));
        if (!open) {
            return undefined;
        }
        return () => {
            window.dispatchEvent(new CustomEvent('context-menu-close'));
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose?.();
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose?.();
            } else if (event.altKey && (event.key === ' ' || event.key === 'Space' || event.code === 'Space')) {
                event.preventDefault();
                event.stopPropagation();
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    const handleSelect = (callback) => () => {
        callback?.();
        onClose?.();
    };

    const menuPosition = position || { top: 0, left: 0 };
    const canMaximize = allowMaximize || isMaximized;
    const maxLabel = isMaximized ? 'Restore' : 'Maximize';

    return (
        <div
            ref={menuRef}
            data-testid="window-system-menu"
            role="menu"
            aria-label="Window menu"
            aria-hidden={!open}
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className={(open ? 'block ' : 'hidden ') +
                'fixed cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-2 z-50 text-sm'}
        >
            <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleSelect(onMove)}
                className="w-full text-left cursor-default py-1 px-4 hover:bg-gray-700"
            >
                Move
            </button>
            <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleSelect(onResize)}
                className="w-full text-left cursor-default py-1 px-4 hover:bg-gray-700"
            >
                Resize
            </button>
            <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleSelect(onMinimize)}
                className="w-full text-left cursor-default py-1 px-4 hover:bg-gray-700"
            >
                Minimize
            </button>
            <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={canMaximize ? handleSelect(onToggleMaximize) : undefined}
                disabled={!canMaximize}
                aria-disabled={!canMaximize}
                className={`w-full text-left cursor-default py-1 px-4 hover:bg-gray-700 ${!canMaximize ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {maxLabel}
            </button>
            <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleSelect(onCloseWindow)}
                className="w-full text-left cursor-default py-1 px-4 hover:bg-gray-700"
            >
                Close
            </button>
        </div>
    );
}

export default WindowSystemMenu;
