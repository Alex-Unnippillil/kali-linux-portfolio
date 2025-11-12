import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const PRESETS = [
    { width: 960, height: 600 },
    { width: 1200, height: 800 },
    { width: 1440, height: 900 },
];

const formatLabel = (width, height) => `Resize to ${width} × ${height}`;
const formatAriaLabel = (width, height) => `Resize window to ${width} by ${height} pixels`;

function WindowMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const handleSelect = (preset) => {
        if (typeof props.onSelectPreset === 'function') {
            props.onSelectPreset(preset);
        }
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
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
        >
            {PRESETS.map((preset) => (
                <button
                    key={`${preset.width}x${preset.height}`}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    aria-label={formatAriaLabel(preset.width, preset.height)}
                    className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
                    onClick={() => handleSelect(preset)}
                >
                    <span className="ml-5">{formatLabel(preset.width, preset.height)}</span>
                </button>
            ))}
        </div>
    );
}

export default WindowMenu;
