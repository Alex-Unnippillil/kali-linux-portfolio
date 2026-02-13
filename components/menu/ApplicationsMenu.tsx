"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import useFocusTrap from '../../hooks/useFocusTrap';

export type KaliCategory = {
  id: string;
  label: string;
};

export const KALI_CATEGORIES: KaliCategory[] = [
  { id: 'information-gathering', label: 'Information Gathering' },
  { id: 'vulnerability-analysis', label: 'Vulnerability Analysis' },
  { id: 'web-application-analysis', label: 'Web Application Analysis' },
  { id: 'database-assessment', label: 'Database Assessment' },
  { id: 'password-attacks', label: 'Password Attacks' },
  { id: 'wireless-attacks', label: 'Wireless Attacks' },
  { id: 'reverse-engineering', label: 'Reverse Engineering' },
  { id: 'exploitation-tools', label: 'Exploitation Tools' },
  { id: 'sniffing-spoofing', label: 'Sniffing & Spoofing' },
  { id: 'post-exploitation', label: 'Post Exploitation' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'social-engineering', label: 'Social Engineering' },
  { id: 'hardware-hacking', label: 'Hardware Hacking' },
  { id: 'extra', label: 'Extra' },
  { id: 'top10', label: 'Top 10 Security Tools' },
];

const DEFAULT_CATEGORY_ICON = '/themes/Yaru/status/preferences-system-symbolic.svg';

const CATEGORY_ICON_LOOKUP: Record<string, string> = {
  'information-gathering': '/themes/kali/categories/information-gathering.svg',
  'vulnerability-analysis': '/themes/kali/categories/vulnerability-analysis.svg',
  'web-application-analysis': '/themes/kali/categories/web-application-analysis.svg',
  'database-assessment': '/themes/kali/categories/database-assessment.svg',
  'password-attacks': '/themes/kali/categories/password-attacks.svg',
  'wireless-attacks': '/themes/kali/categories/wireless-attacks.svg',
  'reverse-engineering': '/themes/kali/categories/reverse-engineering.svg',
  'exploitation-tools': '/themes/kali/categories/exploitation-tools.svg',
  'sniffing-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'sniffing-and-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'post-exploitation': '/themes/kali/categories/post-exploitation.svg',
  'maintaining-access': '/themes/kali/categories/post-exploitation.svg',
  'forensics': '/themes/kali/categories/forensics.svg',
  'reporting': '/themes/kali/categories/reporting.svg',
  'reporting-tools': '/themes/kali/categories/reporting.svg',
  'social-engineering': '/themes/kali/categories/social-engineering.svg',
  'social-engineering-tools': '/themes/kali/categories/social-engineering.svg',
  'hardware-hacking': '/themes/kali/categories/hardware-hacking.svg',
  'extra': '/themes/kali/categories/extra.svg',
  'miscellaneous': '/themes/kali/categories/extra.svg',
  'top10': '/themes/kali/categories/top10.svg',
  'top-10-tools': '/themes/kali/categories/top10.svg',
  'stress-testing': '/themes/kali/categories/exploitation-tools.svg',
};

type CategoryIconProps = {
  categoryId: string;
  label: string;
};

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, label }) => {
  const [src, setSrc] = useState<string>(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);

  useEffect(() => {
    setSrc(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);
  }, [categoryId]);

  return (
    <Image
      src={src}
      alt={`${label} category icon`}
      width={20}
      height={20}
      className="h-5 w-5 flex-shrink-0"
      onError={() => {
        if (src !== DEFAULT_CATEGORY_ICON) {
          setSrc(DEFAULT_CATEGORY_ICON);
        }
      }}
    />
  );
};

type ApplicationsMenuProps = {
  activeCategory: string;
  onSelect: (id: string) => void;
  open?: boolean;
  onClose?: () => void;
  anchorRef?: React.RefObject<HTMLElement> | null;
};

const DEFAULT_POSITION = { top: 56, left: 12 } as const;

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({
  activeCategory,
  onSelect,
  open = true,
  onClose,
  anchorRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>(DEFAULT_POSITION);
  const previousFocusRef = useRef<Element | null>(null);

  useFocusTrap(menuRef, open);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;

    const focusFirstItem = () => {
      const firstButton = menuRef.current?.querySelector<HTMLButtonElement>('button');
      firstButton?.focus();
    };

    focusFirstItem();

    return () => {
      const previous = previousFocusRef.current as HTMLElement | null;
      previous?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const updatePosition = () => {
      const anchor = anchorRef?.current;
      if (!anchor) {
        setPosition(DEFAULT_POSITION);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        left: rect.left,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const menuNode = menuRef.current;
      if (!menuNode) {
        return;
      }

      const clickedInside = menuNode.contains(target);
      const clickedAnchor = anchorRef?.current ? anchorRef.current.contains(target) : false;

      if (!clickedInside && !clickedAnchor) {
        onClose?.();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open) {
    return null;
  }

  const content = (
    <div className="fixed inset-0 z-[2000] pointer-events-none" role="presentation">
      <div
        ref={menuRef}
        className="pointer-events-auto absolute w-80 rounded-md border border-black/20 bg-gray-800/95 p-3 text-white shadow-xl backdrop-blur"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-modal="true"
        aria-label="Kali application categories"
      >
        <nav aria-label="Kali application categories">
          <ul className="space-y-1">
            {KALI_CATEGORIES.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(category.id)}
                    className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                      isActive ? 'bg-gray-700 text-white' : 'bg-transparent hover:bg-gray-700/60'
                    }`}
                    aria-pressed={isActive}
                  >
                    <CategoryIcon categoryId={category.id} label={category.label} />
                    <span className="text-sm font-medium">{category.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ApplicationsMenu;
