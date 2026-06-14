import React, { useEffect, useRef, useState } from 'react';

interface Segment {
  name: string;
  /**
   * Optional display label for the segment. Useful for overriding long folder names
   * or providing localized labels while keeping the original name for navigation.
   */
  displayName?: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const MAX_LABEL_LENGTH = 16;

const getSegmentLabel = (segment: Segment) => {
  const label = segment.displayName ?? segment.name;
  if (!label) {
    return '/';
  }

  if (label.length > MAX_LABEL_LENGTH) {
    return `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`;
  }

  return label;
};

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen && menuItemRefs.current[0]) {
      menuItemRefs.current[0].focus();
    }
  }, [isMenuOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsMenuOpen(false);
      toggleButtonRef.current?.focus();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    if (menuItemRefs.current.length === 0) {
      return;
    }

    event.preventDefault();
    const { activeElement } = document;
    const currentIndex = menuItemRefs.current.findIndex((ref) => ref === activeElement);
    if (currentIndex === -1) {
      menuItemRefs.current[0]?.focus();
      return;
    }

    const nextIndex =
      event.key === 'ArrowDown'
        ? (currentIndex + 1) % menuItemRefs.current.length
        : (currentIndex - 1 + menuItemRefs.current.length) % menuItemRefs.current.length;

    menuItemRefs.current[nextIndex]?.focus();
  };

  const handleToggleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsMenuOpen(true);
    } else if (event.key === 'Escape') {
      setIsMenuOpen(false);
    }
  };

  const handleSelectSegment = (index: number) => {
    onNavigate(index);
    setIsMenuOpen(false);
  };

  if (!path || path.length === 0) {
    return null;
  }

  const middleSegments = path.slice(1, -1);
  menuItemRefs.current = [];
  const hiddenCount = middleSegments.length;
  const toggleLabel = hiddenCount === 1
    ? 'Show 1 hidden breadcrumb level'
    : `Show ${hiddenCount} hidden breadcrumb levels`;

  const renderSegment = (segment: Segment, index: number, showDivider: boolean) => (
    <React.Fragment key={`${segment.name}-${index}`}>
      <button
        type="button"
        onClick={() => onNavigate(index)}
        className="hover:underline focus:outline-none"
        aria-current={index === path.length - 1 ? 'page' : undefined}
        title={segment.displayName ?? segment.name}
      >
        {getSegmentLabel(segment)}
      </button>
      {showDivider && <span aria-hidden="true">/</span>}
    </React.Fragment>
  );

  return (
    <nav className="flex items-center space-x-1 text-white" aria-label="Breadcrumb">
      {path.length <= 3 &&
        path.map((segment, index) =>
          renderSegment(segment, index, index < path.length - 1),
        )}

      {path.length > 3 && (
        <>
          {renderSegment(path[0], 0, true)}
          <div
            ref={popoverRef}
            className="relative inline-flex"
            onBlur={(event) => {
              if (
                popoverRef.current &&
                event.relatedTarget &&
                popoverRef.current.contains(event.relatedTarget as Node)
              ) {
                return;
              }

              setIsMenuOpen(false);
            }}
          >
            <button
              type="button"
              ref={toggleButtonRef}
              onClick={() => setIsMenuOpen((open) => !open)}
              onKeyDown={handleToggleKeyDown}
              className="flex items-center justify-center rounded px-1 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls="breadcrumb-collapsed-menu"
              aria-label={toggleLabel}
              title={toggleLabel}
            >
              …
            </button>
            <span className="mx-0.5" aria-hidden="true">
              /
            </span>
            {isMenuOpen && middleSegments.length > 0 && (
              <ul
                id="breadcrumb-collapsed-menu"
                role="menu"
                className="absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-md border border-white/20 bg-neutral-800 p-1 text-sm shadow-lg focus:outline-none"
                onKeyDown={handleMenuKeyDown}
              >
                {middleSegments.map((segment, middleIndex) => {
                  const actualIndex = middleIndex + 1;
                  return (
                    <li key={`${segment.name}-${actualIndex}`} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        ref={(el) => {
                          if (el) {
                            menuItemRefs.current[middleIndex] = el;
                          }
                        }}
                        onClick={() => handleSelectSegment(actualIndex)}
                        className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                        title={segment.displayName ?? segment.name}
                      >
                        {getSegmentLabel(segment)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {renderSegment(path[path.length - 1], path.length - 1, false)}
        </>
      )}
    </nav>
  );
};

export default Breadcrumbs;
