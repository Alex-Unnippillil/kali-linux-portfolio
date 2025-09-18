import React, { useState, useRef, useEffect, useMemo } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export interface MenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  accelerator?: string;
  submenu?: MenuItem[];
}

interface ContextMenuProps {
  /** Element that triggers this context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Menu items to render */
  items: MenuItem[];
}

interface MenuListProps {
  items: MenuItem[];
  depth: number;
  parentPath: number[];
  open: boolean;
  openPath: number[];
  registerItem: (path: number[], node: HTMLButtonElement | null) => void;
  setOpenPath: React.Dispatch<React.SetStateAction<number[]>>;
  setPendingFocus: React.Dispatch<React.SetStateAction<number[] | null>>;
  setActivePath: React.Dispatch<React.SetStateAction<number[]>>;
  closeMenu: () => void;
}

const pathKey = (path: number[]) => path.join('-');

const isPathOpen = (openPath: number[], path: number[]) => {
  if (path.length === 0) return true;
  if (openPath.length < path.length) return false;
  return path.every((segment, index) => openPath[index] === segment);
};

const MenuList: React.FC<MenuListProps> = ({
  items,
  depth,
  parentPath,
  open,
  openPath,
  registerItem,
  setOpenPath,
  setPendingFocus,
  setActivePath,
  closeMenu,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useRovingTabIndex(listRef as React.RefObject<HTMLElement>, open, 'vertical');

  const containerClasses =
    'cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm';

  return (
    <div
      role="menu"
      ref={listRef}
      aria-hidden={!open}
      className={
        (open ? 'block ' : 'hidden ') +
        (depth === 0 ? containerClasses : `${containerClasses} left-full top-0 ml-1`)
      }
    >
      {items.map((item, index) => {
        const path = [...parentPath, index];
        const key = pathKey(path);
        const hasSubmenu = Boolean(item.submenu && item.submenu.length);
        const submenuItems = item.submenu ?? [];
        const submenuOpen = hasSubmenu && isPathOpen(openPath, path);
        const disabled = Boolean(item.disabled);

        const focusPath = () => {
          setActivePath(path);
          setOpenPath(prev => prev.slice(0, path.length));
        };

        const openSubmenu = () => {
          if (!hasSubmenu) return;
          setOpenPath(path);
          setPendingFocus([...path, 0]);
        };

        const closeSubmenu = () => {
          if (path.length === 0) return;
          setOpenPath(prev => {
            if (prev.length === 0) return prev;
            if (prev.length >= path.length) {
              return prev.slice(0, path.length - 1);
            }
            return prev.slice(0, prev.length - 1);
          });
          const targetPath = path.length > 1 ? path.slice(0, -1) : path;
          setPendingFocus(targetPath);
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
          if (disabled) return;
          if (event.key === 'ArrowRight' || (event.key === 'Enter' && hasSubmenu)) {
            if (hasSubmenu) {
              event.preventDefault();
              openSubmenu();
            }
          } else if (event.key === 'ArrowLeft') {
            if (path.length > 0) {
              event.preventDefault();
              closeSubmenu();
            }
          }
        };

        const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          if (hasSubmenu) {
            event.preventDefault();
            openSubmenu();
            return;
          }
          item.onSelect?.();
          closeMenu();
        };

        const handleMouseEnter = () => {
          if (disabled) return;
          setActivePath(path);
          if (hasSubmenu) {
            setOpenPath(path);
          } else {
            setOpenPath(prev => prev.slice(0, path.length));
          }
        };

        return (
          <div key={key} className="relative">
            <button
              type="button"
              data-path={key}
              ref={node => registerItem(path, node)}
              role="menuitem"
              tabIndex={-1}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              aria-haspopup={hasSubmenu ? 'true' : undefined}
              aria-expanded={hasSubmenu ? (submenuOpen ? 'true' : 'false') : undefined}
              onFocus={focusPath}
              onMouseEnter={handleMouseEnter}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-default hover:bg-gray-700 ${
                disabled ? 'text-gray-400 cursor-not-allowed' : ''
              }`}
            >
              <span className="flex-1 mr-3 truncate">{item.label}</span>
              <span className="flex items-center gap-2 ml-auto text-xs text-gray-300">
                {item.accelerator && <span>{item.accelerator}</span>}
                {hasSubmenu && <span aria-hidden="true">›</span>}
              </span>
            </button>
            {hasSubmenu && submenuOpen && (
              <MenuList
                items={submenuItems}
                depth={depth + 1}
                parentPath={path}
                open
                openPath={openPath}
                registerItem={registerItem}
                setOpenPath={setOpenPath}
                setPendingFocus={setPendingFocus}
                setActivePath={setActivePath}
                closeMenu={closeMenu}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Accessible context menu that supports right click and Shift+F10
 * activation. Uses roving tab index for keyboard navigation and
 * dispatches global events when opened/closed so backgrounds can
 * be made inert.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ targetRef, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [openPath, setOpenPath] = useState<number[]>([]);
  const [, setActivePath] = useState<number[]>([]);
  const [pendingFocus, setPendingFocus] = useState<number[] | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);

  const registerItem = (path: number[], node: HTMLButtonElement | null) => {
    const key = pathKey(path);
    if (node) {
      itemRefs.current.set(key, node);
    } else {
      itemRefs.current.delete(key);
    }
  };

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.pageX, y: e.pageY });
      setOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        setPos({ x: rect.left, y: rect.bottom });
        setOpen(true);
      }
    };

    node.addEventListener('contextmenu', handleContextMenu);
    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('contextmenu', handleContextMenu);
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetRef]);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('context-menu-open'));
    } else {
      window.dispatchEvent(new CustomEvent('context-menu-close'));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setOpenPath([]);
      setActivePath([]);
      return;
    }
    setPendingFocus([0]);
  }, [open]);

  useEffect(() => {
    if (!pendingFocus) return;
    const key = pathKey(pendingFocus);
    const node = itemRefs.current.get(key);
    if (node) {
      node.focus();
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  const closeMenu = () => setOpen(false);

  const rootItems = useMemo(() => items ?? [], [items]);

  return (
    <div
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
      className={(open ? 'block ' : 'hidden ') + 'absolute'}
    >
      <MenuList
        items={rootItems}
        depth={0}
        parentPath={[]}
        open={open}
        openPath={openPath}
        registerItem={registerItem}
        setOpenPath={setOpenPath}
        setPendingFocus={setPendingFocus}
        setActivePath={setActivePath}
        closeMenu={closeMenu}
      />
    </div>
  );
};

export default ContextMenu;

