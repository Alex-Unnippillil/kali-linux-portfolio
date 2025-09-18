import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

interface DesktopContextMenuProps {
  active: boolean;
  position: { x: number; y: number };
  isFullScreen: boolean;
  onArrange: () => void;
  onNewFolder: () => void;
  onCreateShortcut: () => void;
  onChangeBackground: () => void;
  onOpenTerminal: () => void;
  onOpenSettings: () => void;
  onToggleFullScreen: () => void;
  onClearSession: () => void;
  onClose: () => void;
}

const iconClass = 'w-4 h-4 flex-shrink-0 text-[var(--color-primary)]';

const GridIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={iconClass}
  >
    <rect x="2.2" y="2.2" width="6" height="6" rx="1.2" />
    <rect x="11.8" y="2.2" width="6" height="6" rx="1.2" />
    <rect x="2.2" y="11.8" width="6" height="6" rx="1.2" />
    <rect x="11.8" y="11.8" width="6" height="6" rx="1.2" />
  </svg>
);

const WallpaperIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={iconClass}
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="16" height="12.5" rx="2" />
    <circle cx="7" cy="8" r="1.6" fill="currentColor" stroke="none" />
    <path d="M4.5 13.5l3.5-3.5 2.5 2.5 2-2 3 3" />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={iconClass}>
    <path d="M3 6.2C3 5.08 3.91 4 5.05 4h3.1l1.28 1.6h5.52C15.98 5.6 17 6.62 17 7.9v6.05A1.8 1.8 0 0 1 15.22 15H4.78A1.78 1.78 0 0 1 3 13.95z" />
    <path
      d="M4.75 4.75h3.05l.96 1.2h5.99"
      fill="none"
      stroke="var(--color-bg)"
      strokeWidth="0.6"
      strokeLinecap="round"
    />
  </svg>
);

const ShortcutIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={iconClass}
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 6.5h5.5v5.5" />
    <path d="M9.5 6.5H14v4.5" />
    <path d="M6 13.5l7-7" />
  </svg>
);

const TerminalIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={iconClass}
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4.5 6.5 7.5 9.5 4.5 12.5" />
    <line x1="9" y1="12.5" x2="13" y2="12.5" />
    <rect x="3.5" y="4" width="13" height="12" rx="1.8" strokeWidth="1.1" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={iconClass}
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  >
    <line x1="4" y1="5" x2="16" y2="5" />
    <line x1="4" y1="10" x2="16" y2="10" />
    <line x1="4" y1="15" x2="16" y2="15" />
    <circle cx="8" cy="5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="10" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="15" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

const FullScreenIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    className={iconClass}
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6.5 4.5 4.5 4.5 4.5 6.5" />
    <polyline points="13.5 4.5 15.5 4.5 15.5 6.5" />
    <polyline points="4.5 13.5 4.5 15.5 6.5 15.5" />
    <polyline points="15.5 13.5 15.5 15.5 13.5 15.5" />
  </svg>
);

const ClearIcon: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={iconClass}>
    <path
      d="M6 6.5h8l-.6 7.7a1.6 1.6 0 0 1-1.6 1.4H8.2a1.6 1.6 0 0 1-1.6-1.4z"
      fill="currentColor"
    />
    <path
      d="M5 5h10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M8.5 3.5h3l.7 1.5h-4.4z"
      fill="currentColor"
    />
  </svg>
);

const Divider: React.FC = () => (
  <div
    role="separator"
    className="my-1 border-t border-[color:var(--color-border)]"
  />
);

const DesktopContextMenu: React.FC<DesktopContextMenuProps> = ({
  active,
  position,
  isFullScreen,
  onArrange,
  onNewFolder,
  onCreateShortcut,
  onChangeBackground,
  onOpenTerminal,
  onOpenSettings,
  onToggleFullScreen,
  onClearSession,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useFocusTrap(menuRef as React.RefObject<HTMLElement>, active);
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, active, 'vertical');

  useEffect(() => {
    if (active) {
      setAdjustedPosition(position);
    }
  }, [active, position]);

  useLayoutEffect(() => {
    if (!active) return;
    const menu = menuRef.current;
    if (!menu) return;
    const { innerWidth, innerHeight } = window;
    const rect = menu.getBoundingClientRect();
    let x = position.x;
    let y = position.y;
    if (x + rect.width > innerWidth) {
      x = Math.max(8, innerWidth - rect.width - 8);
    }
    if (y + rect.height > innerHeight) {
      y = Math.max(8, innerHeight - rect.height - 8);
    }
    if (x !== adjustedPosition.x || y !== adjustedPosition.y) {
      setAdjustedPosition({ x, y });
    }
  }, [active, position, adjustedPosition.x, adjustedPosition.y]);

  useEffect(() => {
    if (!active) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]',
    );
    firstItem?.focus();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [active, onClose]);

  const menuSections = useMemo(
    () => [
      [
        {
          label: 'Arrange Desktop Icons',
          action: onArrange,
          icon: <GridIcon />,
        },
        {
          label: 'Change Desktop Background…',
          action: onChangeBackground,
          icon: <WallpaperIcon />,
        },
      ],
      [
        {
          label: 'New Folder',
          action: onNewFolder,
          icon: <FolderIcon />,
        },
        {
          label: 'Create Shortcut…',
          action: onCreateShortcut,
          icon: <ShortcutIcon />,
        },
      ],
      [
        {
          label: 'Open Terminal Here',
          action: onOpenTerminal,
          icon: <TerminalIcon />,
        },
        {
          label: 'System Settings',
          action: onOpenSettings,
          icon: <SettingsIcon />,
        },
      ],
      [
        {
          label: isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen',
          action: onToggleFullScreen,
          icon: <FullScreenIcon />,
        },
        {
          label: 'Clear Session',
          action: onClearSession,
          icon: <ClearIcon />,
        },
      ],
    ],
    [
      isFullScreen,
      onArrange,
      onChangeBackground,
      onClearSession,
      onCreateShortcut,
      onNewFolder,
      onOpenSettings,
      onOpenTerminal,
      onToggleFullScreen,
    ],
  );

  if (!active) {
    return null;
  }

  return (
    <div
      id="desktop-menu"
      role="menu"
      aria-label="Desktop context menu"
      ref={menuRef}
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="absolute z-50 min-w-[15rem] max-w-xs rounded-lg border border-[color:var(--color-border)] context-menu-bg p-2 text-[var(--color-text)] shadow-lg"
    >
      {menuSections.map((section, index) => (
        <React.Fragment key={index}>
          {index !== 0 && <Divider />}
          {section.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-[color:var(--color-primary)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default DesktopContextMenu;
