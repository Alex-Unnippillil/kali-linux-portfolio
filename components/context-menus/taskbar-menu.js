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

    const minimized = Boolean(props.minimized);
    const maximized = Boolean(props.maximized);
    const allowMaximize = props.allowMaximize !== false;
    const allowPin = props.allowPin !== false;
    const pinned = Boolean(props.pinned);

    const canRestore = minimized || maximized;
    const canMinimize = !minimized;
    const canMaximize = allowMaximize && !maximized;
    const canPinToggle = allowPin;

    const buttonBaseClass = 'w-full text-left cursor-default py-0.5 mb-1.5 rounded px-0 hover:bg-gray-700 focus-visible:bg-gray-700';
    const disabledClass = 'text-gray-400 hover:bg-transparent focus-visible:bg-transparent cursor-not-allowed';

    const handleRestore = () => {
        if (!canRestore) return;
        props.onRestore && props.onRestore();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleMinimize = () => {
        if (!canMinimize) return;
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleMaximize = () => {
        if (!canMaximize) return;
        props.onMaximize && props.onMaximize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handlePinToggle = () => {
        if (!canPinToggle) return;
        if (pinned) {
            props.onUnpin && props.onUnpin();
        } else {
            props.onPin && props.onPin();
        }
        props.onCloseMenu && props.onCloseMenu();
    };

    const pinLabel = pinned ? 'Unpin from Favorites' : 'Pin to Favorites';

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
                aria-disabled={!canRestore}
                disabled={!canRestore}
                className={`${buttonBaseClass} ${canRestore ? '' : disabledClass}`}
            >
                <span className="ml-5">Restore</span>
            </button>
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label="Minimize Window"
                aria-disabled={!canMinimize}
                disabled={!canMinimize}
                className={`${buttonBaseClass} ${canMinimize ? '' : disabledClass}`}
            >
                <span className="ml-5">Minimize</span>
            </button>
            <button
                type="button"
                onClick={handleMaximize}
                role="menuitem"
                aria-label="Maximize Window"
                aria-disabled={!canMaximize}
                disabled={!canMaximize}
                className={`${buttonBaseClass} ${canMaximize ? '' : disabledClass}`}
            >
                <span className="ml-5">Maximize</span>
            </button>
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                className={`${buttonBaseClass}`}
            >
                <span className="ml-5">Close</span>
            </button>
            <div role="separator" className="mx-5 my-2 border-t border-gray-800" aria-hidden="true" />
            <button
                type="button"
                onClick={handlePinToggle}
                role="menuitem"
                aria-label={pinLabel}
                aria-disabled={!canPinToggle}
                disabled={!canPinToggle}
                className={`${buttonBaseClass} ${canPinToggle ? '' : disabledClass}`}
            >
                <span className="ml-5">{pinLabel}</span>
            </button>
        </div>
    );
}

export default TaskbarMenu;
