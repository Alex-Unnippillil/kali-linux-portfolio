import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Place {
  id: string;
  label: string;
  description?: string;
  href?: string;
  onSelect?: () => void;
}

const PLACES: Place[] = [
  {
    id: 'desktop',
    label: 'Desktop',
    description: 'Return to the desktop overview',
    href: '/',
  },
  {
    id: 'apps',
    label: 'Applications',
    description: 'Browse the installed applications',
    href: '/apps',
  },
  {
    id: 'games',
    label: 'Games Library',
    description: 'Play retro and security themed games',
    href: '/games',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Open the scratchpad notes app',
    href: '/notes',
  },
  {
    id: 'projects',
    label: 'Project Gallery',
    description: 'Explore highlighted portfolio projects',
    href: '/apps/project-gallery',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Launch the simulated Kali terminal',
    href: '/apps/terminal',
  },
];

const PlacesMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const places = useMemo(() => PLACES, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const openPlace = useCallback(
    (place: Place, { newWindow = false }: { newWindow?: boolean } = {}) => {
      if (place.onSelect) {
        place.onSelect();
        closeMenu();
        return;
      }

      if (!place.href || typeof window === 'undefined') {
        closeMenu();
        return;
      }

      if (newWindow) {
        window.open(place.href, '_blank', 'noopener,noreferrer');
        closeMenu();
      } else {
        closeMenu();
        window.location.href = place.href;
      }
    },
    [closeMenu],
  );

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, places.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const total = places.length;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (total > 0) {
            setHighlight((idx) => (idx + 1) % total);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (total > 0) {
            setHighlight((idx) => (idx - 1 + total) % total);
          }
          break;
        case 'Enter': {
          event.preventDefault();
          const place = places[highlight];
          if (place) openPlace(place);
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          const place = places[highlight];
          if (place) openPlace(place, { newWindow: true });
          break;
        }
        case 'Escape':
          event.preventDefault();
          closeMenu();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, highlight, places, closeMenu, openPlace]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        Places
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="menu"
            tabIndex={-1}
            className="absolute left-0 mt-1 z-50 w-64 bg-ub-grey text-white rounded shadow-lg focus:outline-none"
          >
            <ul role="none">
              {places.map((place, index) => (
                <li key={place.id} role="presentation">
                  <button
                    type="button"
                    role="menuitem"
                    className={`w-full text-left px-4 py-2 flex flex-col focus:outline-none ${
                      highlight === index ? 'bg-ubt-blue text-white' : 'hover:bg-ub-cool-grey'
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onFocus={() => setHighlight(index)}
                    onClick={() => openPlace(place)}
                  >
                    <span>{place.label}</span>
                    {place.description && (
                      <span className="text-xs text-gray-300">{place.description}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PlacesMenu;
