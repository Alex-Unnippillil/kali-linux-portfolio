import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose();
        }
    };

    const handleShade = () => {
        props.onShade && props.onShade();
        props.onClose && props.onClose();
    };

    return (
        <div
            id="window-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleShade}
                role="menuitem"
                aria-label={props.shaded ? 'Unshade Window' : 'Shade Window'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.shaded ? 'Unshade' : 'Shade'}</span>
            </button>
        </div>
    );
}

export default WindowMenu;
