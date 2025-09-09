import React, { useEffect, useRef, useState } from "react";
import useFocusTrap from "@/hooks/useFocusTrap";
import useRovingTabIndex from "@/hooks/useRovingTabIndex";

export interface ContextMenuItem {
  /** Text label displayed for the menu item. */
  label?: string;
  /** Optional icon element shown before the label. */
  icon?: React.ReactNode;
  /** Invoked when the item is selected. */
  onClick?: () => void;
  /** Renders a visual separator instead of an item when true. */
  separator?: boolean;
}

interface ContextMenuProps {
  /** Menu item definitions. */
  items: ContextMenuItem[];
  /** Element that the context menu is attached to. */
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, children }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(menuRef, visible);
  useRovingTabIndex(menuRef, visible, "vertical");

  useEffect(() => {
    const handleClick = () => setVisible(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    if (visible) {
      document.addEventListener("click", handleClick);
      document.addEventListener("contextmenu", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible]);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCoords({ x: e.clientX, y: e.clientY });
    setVisible(true);
  };

  const runAction = (fn?: () => void) => {
    fn && fn();
    setVisible(false);
  };

  return (
    <div onContextMenu={openMenu} className="relative inline-block">
      {children}
      <div
        ref={menuRef}
        role="menu"
        aria-hidden={!visible}
        className={`${visible ? "block" : "hidden"} cursor-default context-menu-bg border border-gray-900 rounded text-white py-2 absolute z-50 text-sm`}
        style={{ top: coords.y, left: coords.x }}
      >
        {items.map((item, idx) =>
          item.separator ? (
            <div
              key={idx}
              role="separator"
              className="border-t border-gray-700 my-1"
            />
          ) : (
            <button
              key={idx}
              role="menuitem"
              tabIndex={visible ? 0 : -1}
              className="w-full flex items-center text-left px-4 py-1 hover:bg-gray-700"
              onClick={() => runAction(item.onClick)}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
};

export default ContextMenu;
