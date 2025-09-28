"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import { useClickOutside } from '../../hooks/useClickOutside';

export type PowerAction = 'lock' | 'logout' | 'restart' | 'reset';

interface PowerMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (action: PowerAction) => void;
  triggerRef: React.RefObject<HTMLElement>;
  disabledActions?: Partial<Record<PowerAction, string>>;
}

const MENU_ITEMS: Array<{ key: PowerAction; label: string; description: string }> = [
  { key: 'lock', label: 'Lock', description: 'Hide windows and require a click to resume.' },
  { key: 'logout', label: 'Log out', description: 'Return to the lock screen and clear workspace.' },
  { key: 'restart', label: 'Restart', description: 'Simulate a reboot of the desktop environment.' },
  { key: 'reset', label: 'Reset UI', description: 'Soft reboot that restores default layout.' },
];

const PowerMenu: React.FC<PowerMenuProps> = ({
  open,
  onClose,
  onSelect,
  triggerRef,
  disabledActions = {},
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useFocusTrap(menuRef, open);
  useRovingTabIndex(menuRef, open, 'vertical');

  useClickOutside([menuRef, triggerRef], () => {
    if (open) {
      onClose();
    }
  }, { enabled: open });

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const firstAvailable = menuRef.current?.querySelector<HTMLElement>(
        '[data-power-menu-item]:not([disabled])'
      );
      if (firstAvailable) {
        firstAvailable.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const items = useMemo(() => MENU_ITEMS, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      id="power-menu"
      role="menu"
      aria-hidden={!open}
      className={`absolute right-3 top-9 w-60 rounded-md border border-black border-opacity-20 bg-ub-cool-grey py-2 text-white shadow-lg ${
        open ? '' : 'hidden'
      }`}
      onKeyDown={handleKeyDown}
    >
      {items.map(item => {
        const disabledReason = disabledActions[item.key];
        return (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            data-power-menu-item
            className={`flex w-full flex-col items-start px-4 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-ub-orange ${
              disabledReason ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-700'
            }`}
            onClick={() => {
              if (disabledReason) return;
              onSelect(item.key);
            }}
            disabled={Boolean(disabledReason)}
            aria-disabled={Boolean(disabledReason)}
            title={disabledReason ?? undefined}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="mt-1 text-xs text-ubt-grey">{item.description}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PowerMenu;
