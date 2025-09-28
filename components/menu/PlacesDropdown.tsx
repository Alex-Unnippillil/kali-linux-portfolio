"use client";

import Image from 'next/image';
import React, { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import PlacesMenu, { PlacesMenuItem } from './PlacesMenu';

type PlacesDropdownProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: PlacesMenuItem[];
  className?: string;
};

const PlacesDropdown: React.FC<PlacesDropdownProps> = ({
  isOpen,
  onOpenChange,
  items,
  className,
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const menuId = `${buttonId}-menu`;

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    onOpenChange(!isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (menuRef.current?.contains(target) || buttonRef.current?.contains(target))
      ) {
        return;
      }
      close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const firstButton = menuRef.current?.querySelector('button');
    if (firstButton instanceof HTMLElement) {
      firstButton.focus({ preventScroll: true });
    } else {
      menuRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    buttonRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const menuItems = useMemo(
    () =>
      items.map(item => ({
        ...item,
        onSelect: () => {
          item.onSelect?.();
          close();
        },
      })),
    [close, items],
  );

  return (
    <div className={`relative inline-flex ${className ?? ''}`}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggle}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 focus:border-ubb-orange"
      >
        <Image
          src="/themes/Kali/places/user-home.svg"
          alt=""
          width={16}
          height={16}
          className="inline mr-1 h-4 w-4"
        />
        Places
      </button>
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-labelledby={buttonId}
        tabIndex={-1}
        className={`absolute left-0 mt-1 w-56 overflow-hidden rounded-md border border-black/20 bg-ub-grey text-white shadow-lg transition-all duration-150 ease-out ${
          isOpen
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-2'
        }`}
      >
        <div className="p-3">
          <PlacesMenu items={menuItems} />
        </div>
      </div>
    </div>
  );
};

export default PlacesDropdown;

