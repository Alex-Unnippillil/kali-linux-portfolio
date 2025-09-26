import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const MOVE_ACTIONS = [
    { action: 'move-up', label: 'Move up', shortcut: 'Ctrl+ArrowUp' },
    { action: 'move-down', label: 'Move down', shortcut: 'Ctrl+ArrowDown' },
    { action: 'move-left', label: 'Move left', shortcut: 'Ctrl+ArrowLeft' },
    { action: 'move-right', label: 'Move right', shortcut: 'Ctrl+ArrowRight' },
];

const RESIZE_ACTIONS = [
    { action: 'shrink-height', label: 'Shrink height', shortcut: 'Ctrl+Shift+ArrowUp' },
    { action: 'grow-height', label: 'Grow height', shortcut: 'Ctrl+Shift+ArrowDown' },
    { action: 'shrink-width', label: 'Shrink width', shortcut: 'Ctrl+Shift+ArrowLeft' },
    { action: 'grow-width', label: 'Grow width', shortcut: 'Ctrl+Shift+ArrowRight' },
];

function SectionHeading({ children }) {
    return (
        <p className="px-4 py-1 text-xs uppercase tracking-widest text-gray-300">
            {children}
        </p>
    );
}

function Divider() {
    return (
        <div className="flex justify-center w-full" role="presentation">
            <div className="border-t border-gray-900 my-1 w-2/3" />
        </div>
    );
}

function WindowMenu({ active, onAction, onClose }) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, active);
    useRovingTabIndex(menuRef, active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose?.();
        }
    };

    const renderButton = (item) => (
        <button
            key={item.action}
            type="button"
            role="menuitem"
            data-action={item.action}
            onClick={() => onAction?.(item.action)}
            className="w-full flex justify-between items-center cursor-default py-1 hover:bg-gray-700 px-4"
        >
            <span>{item.label}</span>
            <span className="text-[11px] text-gray-300">{item.shortcut}</span>
        </button>
    );

    return (
        <div
            id="window-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(active ? ' block ' : ' hidden ') +
                'cursor-default w-64 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm'}
        >
            <SectionHeading>Move window</SectionHeading>
            {MOVE_ACTIONS.map(renderButton)}
            <Divider />
            <SectionHeading>Resize window</SectionHeading>
            {RESIZE_ACTIONS.map(renderButton)}
        </div>
    );
}

export default WindowMenu;
