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

    const handleToggleAbove = () => {
        props.onToggleAbove && props.onToggleAbove();
    };

    return (
        <div
            id="window-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleToggleAbove}
                role="menuitem"
                aria-label={props.above ? 'Disable Always on Top' : 'Always on Top'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.above ? 'Disable Always on Top' : 'Always on Top'}</span>
            </button>
        </div>
    );
}

export default WindowMenu;

