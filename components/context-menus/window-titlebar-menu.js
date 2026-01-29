import React, { useEffect, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowTitlebarMenu({ active, position, items, onClose }) {
    const menuRef = useRef(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useFocusTrap(menuRef, active);
    useRovingTabIndex(menuRef, active, 'vertical');

    useEffect(() => {
        if (active) {
            setAdjustedPosition(position);
        }
    }, [active, position]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (active) {
            window.dispatchEvent(new CustomEvent('context-menu-open'));
        } else {
            window.dispatchEvent(new CustomEvent('context-menu-close'));
        }
    }, [active]);

    useEffect(() => {
        if (!active) return;
        const handleOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose?.();
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [active, onClose]);

    useEffect(() => {
        if (!active) return;
        const node = menuRef.current;
        if (!node || typeof window === 'undefined') return;

        const menuWidth = node.offsetWidth || 0;
        const menuHeight = node.offsetHeight || 0;
        let nextX = position.x;
        let nextY = position.y;

        if (nextX + menuWidth > window.innerWidth) {
            nextX = Math.max(0, window.innerWidth - menuWidth);
        }
        if (nextY + menuHeight > window.innerHeight) {
            nextY = Math.max(0, window.innerHeight - menuHeight);
        }

        if (nextX !== adjustedPosition.x || nextY !== adjustedPosition.y) {
            setAdjustedPosition({ x: nextX, y: nextY });
        }
    }, [active, position, adjustedPosition.x, adjustedPosition.y]);

    const handleSelect = (item) => {
        if (item.disabled) return;
        item.onSelect?.();
        onClose?.();
    };

    return (
        <div
            id="window-titlebar-menu"
            role="menu"
            aria-label="Window options"
            aria-hidden={!active}
            ref={menuRef}
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
                position: 'fixed',
            }}
            className={(active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm'}
        >
            {items.map((item, index) => {
                if (item.type === 'separator') {
                    return (
                        <div key={`separator-${index}`} className="flex justify-center w-full">
                            <div className="border-t border-gray-900 py-1 w-2/5"></div>
                        </div>
                    );
                }

                const isDisabled = Boolean(item.disabled);
                return (
                    <button
                        key={item.key || `${item.label}-${index}`}
                        type="button"
                        role="menuitem"
                        aria-disabled={isDisabled}
                        tabIndex={-1}
                        onClick={() => handleSelect(item)}
                        className={[
                            'w-full text-left cursor-default py-0.5 mb-1.5',
                            isDisabled ? 'text-gray-400' : 'hover:bg-gray-700',
                        ].join(' ')}
                    >
                        <span className="ml-5">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default WindowTitlebarMenu;
