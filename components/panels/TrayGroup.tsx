'use client';

import React, { useState, useRef, useEffect, ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface TrayItem {
  /** Unique id for the tray button */
  id: string;
  /** Button element to render in the tray */
  button: ReactElement;
  /** Popover element shown when the tray is active */
  popover?: ReactElement;
}

interface TrayGroupProps {
  items: TrayItem[];
}

/**
 * Renders a group of tray buttons and manages their popovers.
 * Each popover is rendered in a portal and closes on Escape or
 * when clicking outside of it.
 */
const TrayGroup: React.FC<TrayGroupProps> = ({ items }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLElement | null>>({});
  const popoverRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!openId) return;

    const handleClick = (e: MouseEvent) => {
      const btn = buttonRefs.current[openId];
      const pop = popoverRefs.current[openId];
      const target = e.target as Node;
      if (btn?.contains(target) || pop?.contains(target)) return;
      setOpenId(null);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openId]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      <div className="flex items-center">
        {items.map((item) => (
          <button
            key={item.id}
            ref={(el) => (buttonRefs.current[item.id] = el)}
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            aria-haspopup={item.popover ? 'true' : undefined}
            aria-expanded={openId === item.id}
            className="relative"
          >
            {item.button}
          </button>
        ))}
      </div>
      {portalTarget &&
        items.map((item) => {
          if (!item.popover || openId !== item.id) return null;
          return createPortal(
            <div ref={(el) => (popoverRefs.current[item.id] = el)}>{item.popover}</div>,
            portalTarget
          );
        })}
    </>
  );
};

export default TrayGroup;

