import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowMenu(props) {
    const {
        active,
        onCloseMenu,
        pos,
        onMove,
        onResize,
        onTop,
        onShade,
        onStick,
        onMaximize,
        onClose,
    } = props;
    const menuRef = useRef(null);
    useFocusTrap(menuRef, active);
    useRovingTabIndex(menuRef, active, 'vertical');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onCloseMenu && onCloseMenu();
        }
    };

    const wrap = (fn) => () => {
        fn && fn();
        onCloseMenu && onCloseMenu();
    };

    return (
        <div
            id="window-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            style={{ left: pos?.x, top: pos?.y }}
            className={(active ? ' block ' : ' hidden ') +
                ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button type="button" onClick={wrap(onMove)} role="menuitem" aria-label="Move Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Move</span>
            </button>
            <button type="button" onClick={wrap(onResize)} role="menuitem" aria-label="Resize Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Resize</span>
            </button>
            <button type="button" onClick={wrap(onTop)} role="menuitem" aria-label="Always on top" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Always on top</span>
            </button>
            <button type="button" onClick={wrap(onShade)} role="menuitem" aria-label="Shade Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Shade</span>
            </button>
            <button type="button" onClick={wrap(onStick)} role="menuitem" aria-label="Stick Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Stick</span>
            </button>
            <button type="button" onClick={wrap(onMaximize)} role="menuitem" aria-label="Maximize Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Maximize</span>
            </button>
            <button type="button" onClick={wrap(onClose)} role="menuitem" aria-label="Close Window" className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5">
                <span className="ml-5">Close</span>
            </button>
        </div>
    );
}

export default WindowMenu;
