import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const wrap = (fn) => () => {
        fn && fn();
        props.onCloseMenu && props.onCloseMenu();
    };

    return (
        <div
            id="window-menu"
            role="menu"
            aria-label="Window context menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-48 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button type="button" aria-label="Move" onClick={wrap(props.onMove)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Move</span></button>
            <button type="button" aria-label="Resize" onClick={wrap(props.onResize)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Resize</span></button>
            <button type="button" aria-label="Always on top" onClick={wrap(props.onTop)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Always on top</span></button>
            <button type="button" aria-label="Shade" onClick={wrap(props.onShade)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Shade</span></button>
            <button type="button" aria-label="Stick" onClick={wrap(props.onStick)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Stick</span></button>
            <button type="button" aria-label="Maximize" onClick={wrap(props.onMaximize)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"><span className="ml-5">Maximize</span></button>
            <button type="button" aria-label="Close" onClick={wrap(props.onClose)} role="menuitem" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"><span className="ml-5">Close</span></button>
        </div>
    );
}

export default WindowMenu;
