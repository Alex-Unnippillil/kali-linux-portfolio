import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const invokeAndClose = (action, shouldInvoke = true) => {
        if (shouldInvoke && typeof action === 'function') {
            action();
        }
        if (shouldInvoke && typeof props.onCloseMenu === 'function') {
            props.onCloseMenu();
        }
    };

    const handleRestore = () => {
        const canRestore = props.canRestore !== false && Boolean(props.onRestore);
        invokeAndClose(props.onRestore, canRestore);
    };

    const handleMinimize = () => {
        const canMinimize = props.canMinimize !== false && Boolean(props.onMinimize);
        invokeAndClose(props.onMinimize, canMinimize);
    };

    const handleMaximize = () => {
        const canMaximize = props.canMaximize !== false && Boolean(props.onMaximize);
        invokeAndClose(props.onMaximize, canMaximize);
    };

    const handleClose = () => {
        invokeAndClose(props.onClose, Boolean(props.onClose));
    };

    const handlePinToggle = () => {
        if (!props.canPin) return;
        const action = props.pinned ? props.onUnpin : props.onPin;
        invokeAndClose(action, Boolean(action));
    };

    const buttonClass = (disabled) => (
        'w-full text-left py-0.5 mb-1.5 rounded-none hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
        + (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-default')
    );

    const pinnedLabel = props.pinned ? 'Unpin from Favorites' : 'Pin to Favorites';

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-48 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleRestore}
                role="menuitem"
                aria-label="Restore Window"
                aria-disabled={props.canRestore === false}
                data-disabled={props.canRestore === false ? 'true' : undefined}
                className={buttonClass(props.canRestore === false)}
            >
                <span className="ml-5">Restore</span>
            </button>
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label="Minimize Window"
                aria-disabled={props.canMinimize === false}
                data-disabled={props.canMinimize === false ? 'true' : undefined}
                className={buttonClass(props.canMinimize === false)}
            >
                <span className="ml-5">Minimize</span>
            </button>
            {props.allowMaximize !== false && (
                <button
                    type="button"
                    onClick={handleMaximize}
                    role="menuitem"
                    aria-label="Maximize Window"
                    aria-disabled={props.canMaximize === false}
                    data-disabled={props.canMaximize === false ? 'true' : undefined}
                    className={buttonClass(props.canMaximize === false)}
                >
                    <span className="ml-5">Maximize</span>
                </button>
            )}
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                className={buttonClass(false)}
            >
                <span className="ml-5">Close</span>
            </button>
            {props.canPin && (
                <button
                    type="button"
                    onClick={handlePinToggle}
                    role="menuitem"
                    aria-label={pinnedLabel}
                    className={buttonClass(false)}
                >
                    <span className="ml-5">{pinnedLabel}</span>
                </button>
            )}
        </div>
    );
}

export default TaskbarMenu;
