import React, { useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

interface DockMenuProps {
  active: boolean;
  onOpenNewWindow?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onRemoveFavorite?: () => void;
  onCloseMenu?: () => void;
}

const DockMenu: React.FC<DockMenuProps> = ({
  active,
  onOpenNewWindow,
  onPin,
  onUnpin,
  onRemoveFavorite,
  onCloseMenu,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuRef as React.RefObject<HTMLElement>, active);
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, active, 'vertical');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseMenu?.();
    }
  };

  const wrapAction = (fn?: () => void) => () => {
    fn?.();
    onCloseMenu?.();
  };

  return (
    <div
      id="dock-menu"
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className={(active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm'}
    >
      <button
        type="button"
        onClick={wrapAction(onOpenNewWindow)}
        role="menuitem"
        aria-label="Open New Window"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Open New Window</span>
      </button>
      <button
        type="button"
        onClick={wrapAction(onPin)}
        role="menuitem"
        aria-label="Pin"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Pin</span>
      </button>
      <button
        type="button"
        onClick={wrapAction(onUnpin)}
        role="menuitem"
        aria-label="Unpin"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Unpin</span>
      </button>
      <button
        type="button"
        onClick={wrapAction(onRemoveFavorite)}
        role="menuitem"
        aria-label="Remove from Favorites"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
      >
        <span className="ml-5">Remove from Favorites</span>
      </button>
    </div>
  );
};

export default DockMenu;

