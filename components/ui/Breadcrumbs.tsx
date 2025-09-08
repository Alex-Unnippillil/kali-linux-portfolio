import React, { useEffect, useRef, useState } from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const menuRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const overflowSegments = path.slice(1, -2);

  const segmentClass =
    'hover:underline focus:outline-none truncate max-w-[150px] max-[320px]:max-w-[80px]';

  const handleNavigate = (index: number) => {
    onNavigate(index);
    setIsOpen(false);
  };

  const openMenu = () => {
    setIsOpen(true);
    // focus first menu item after open
    setTimeout(() => menuRefs.current[0]?.focus(), 0);
  };

  const closeMenu = () => setIsOpen(false);

  const handleOverflowKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (['Enter', ' '].includes(e.key) || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const idx = menuRefs.current.findIndex(
      (ref) => ref === document.activeElement,
    );
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      overflowButtonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % menuRefs.current.length;
      menuRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + menuRefs.current.length) % menuRefs.current.length;
      menuRefs.current[prev]?.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        !overflowButtonRef.current?.parentElement?.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const renderSegments = () => {
    if (path.length <= 4) {
      return path.map((seg, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span>/</span>}
          <button
            type="button"
            onClick={() => handleNavigate(idx)}
            className={segmentClass}
          >
            {seg.name || '/'}
          </button>
        </React.Fragment>
      ));
    }

    const start = path[0];
    const endSegments = path.slice(-2);
    return (
      <>
        <button
          type="button"
          onClick={() => handleNavigate(0)}
          className={segmentClass}
        >
          {start.name || '/'}
        </button>
        <span>/</span>
        <div className="relative">
          <button
            ref={overflowButtonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => (isOpen ? closeMenu() : openMenu())}
            onKeyDown={handleOverflowKeyDown}
            className="hover:underline focus:outline-none"
            aria-label="Show more path segments"
          >
            …
          </button>
          {isOpen && (
            <ul
              role="menu"
              className="absolute z-10 mt-1 bg-bg border border-border rounded shadow-card"
              onKeyDown={handleMenuKeyDown}
            >
              {overflowSegments.map((seg, idx) => (
                <li key={idx} role="none">
                  <button
                    ref={(el) => (menuRefs.current[idx] = el)}
                    role="menuitem"
                    type="button"
                    onClick={() => handleNavigate(idx + 1)}
                    className="block w-full px-2 py-1 text-left hover:bg-surface focus:bg-surface"
                  >
                    {seg.name || '/'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {endSegments.map((seg, idx) => (
          <React.Fragment key={idx}>
            <span>/</span>
            <button
              type="button"
              onClick={() => handleNavigate(path.length - 2 + idx)}
              className={segmentClass}
            >
              {seg.name || '/'}
            </button>
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <nav
      className="flex flex-wrap items-center gap-x-1 gap-y-1 text-white max-w-full"
      aria-label="Breadcrumb"
    >
      {renderSegments()}
    </nav>
  );
};

export default Breadcrumbs;
