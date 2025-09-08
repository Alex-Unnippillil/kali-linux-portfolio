'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

interface DocMegaMenuProps {
  onClose: () => void;
}

export default function DocMegaMenu({ onClose }: DocMegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const items = [
    { href: '/docs', label: 'Docs' },
    { href: '/tools', label: 'Tools Docs' },
    { href: '/legal', label: 'Policy' },
  ];
  const COLUMNS = 2;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    itemRefs.current[0]?.focus();

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (el) => el === document.activeElement,
    );

    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const nextIndex =
        (currentIndex + dir + items.length) % items.length;
      itemRefs.current[nextIndex]?.focus();
      return;
    }

    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + COLUMNS, items.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - COLUMNS, 0);
        break;
      default:
        return;
    }

    e.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      ref={ref}
      className="fixed left-0 top-12 z-50 w-full bg-white p-4 shadow-lg"
    >
      <ul
        className="grid grid-cols-2 gap-4"
        onKeyDown={handleListKeyDown}
        role="menu"
      >
        {items.map((item, i) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block rounded border p-4 hover:bg-gray-50 focus:outline-none focus:ring"
              ref={(el) => (itemRefs.current[i] = el)}
              role="menuitem"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

