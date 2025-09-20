import React, { useRef } from 'react';
import Image from 'next/image';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowControlsMenu({
  active,
  desktops = [],
  activeDesktopId,
  onMove,
  onClose,
}) {
  const menuRef = useRef(null);
  useFocusTrap(menuRef, active);
  useRovingTabIndex(menuRef, active, 'vertical');

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose?.();
    }
  };

  const handleMove = (desktopId) => {
    if (!desktopId) return;
    onMove?.(desktopId);
  };

  if (!desktops.length) {
    return null;
  }

  return (
    <div
      id="windowControls-menu"
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className={(active ? ' block ' : ' hidden ') + ' cursor-default w-60 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm'}
    >
      <div className="px-5 pb-2 text-xs uppercase tracking-wide text-gray-400">Move to desktop</div>
      {desktops.map((desktop) => (
        <button
          key={desktop.id}
          type="button"
          role="menuitem"
          onClick={() => handleMove(desktop.id)}
          className={`w-full text-left cursor-default py-1.5 px-5 flex items-center gap-3 hover:bg-gray-700 ${desktop.id === activeDesktopId ? 'text-ub-orange' : ''}`}
        >
          <Image
            src={desktop.icon}
            alt=""
            width={20}
            height={20}
            className="w-5 h-5"
            sizes="20px"
          />
          <span className="truncate">{desktop.name}</span>
        </button>
      ))}
    </div>
  );
}

export default WindowControlsMenu;
