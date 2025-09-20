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

    const handleMinimize = () => {
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleTile = (position) => {
        props.onTile && props.onTile(position);
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleCascade = () => {
        props.onCascade && props.onCascade();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label={props.minimized ? 'Restore Window' : 'Minimize Window'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </button>
            <div className="border-t border-gray-800 border-opacity-70 my-1" role="separator" />
            <div role="group" aria-label="Tile window">
                <button
                    type="button"
                    onClick={() => handleTile('left')}
                    role="menuitem"
                    aria-label="Tile window to the left quadrant"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                >
                    <span className="ml-5">Tile Left Quadrant</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTile('right')}
                    role="menuitem"
                    aria-label="Tile window to the right quadrant"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                >
                    <span className="ml-5">Tile Right Quadrant</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTile('top')}
                    role="menuitem"
                    aria-label="Tile window to the top quadrant"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                >
                    <span className="ml-5">Tile Top Quadrant</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTile('bottom')}
                    role="menuitem"
                    aria-label="Tile window to the bottom quadrant"
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                >
                    <span className="ml-5">Tile Bottom Quadrant</span>
                </button>
            </div>
            <button
                type="button"
                onClick={handleCascade}
                role="menuitem"
                aria-label="Cascade all open windows"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Cascade All</span>
            </button>
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Close</span>
            </button>
        </div>
    );
}

export default TaskbarMenu;
