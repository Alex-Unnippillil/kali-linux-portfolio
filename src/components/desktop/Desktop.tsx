import React, { useCallback, useEffect, useRef, useState } from 'react';
import DesktopContextMenu from './DesktopContextMenu';
import Dock from './Dock';
import Panel from '../panel/Panel';
import HotCorner from './HotCorner';
import AppSwitcher from './AppSwitcher';
import { activateWindow, getWindows } from '@/lib/window-manager';

export interface DesktopIcon {
  id: string;
  title: string;
  x: number;
  y: number;
}

/** Arrange icons into a grid based on container width. */
export function arrangeIconsToGrid(
  icons: DesktopIcon[],
  width: number,
  grid = 80
): DesktopIcon[] {
  if (width <= 0) return icons;
  const cols = Math.max(1, Math.floor(width / grid));
  return icons.map((icon, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return { ...icon, x: col * grid, y: row * grid };
  });
}

/**
 * Minimal desktop implementation that demonstrates context menu support and
 * grid-based icon arrangement.
 */
export const Desktop: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [icons, setIcons] = useState<DesktopIcon[]>([]);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switchIndex, setSwitchIndex] = useState(0);

  // Example icons for demonstration
  useEffect(() => {
    setIcons([
      { id: 'about', title: 'About', x: 0, y: 0 },
      { id: 'settings', title: 'Settings', x: 100, y: 0 },
      { id: 'terminal', title: 'Terminal', x: 200, y: 0 },
    ]);
  }, []);

  const closeMenu = () => setMenuPos(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleArrange = useCallback(() => {
    const width = containerRef.current?.clientWidth || window.innerWidth;
    setIcons((prev) => arrangeIconsToGrid(prev, width));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        const wins = getWindows();
        if (wins.length) {
          setShowSwitcher(true);
          setSwitchIndex(0);
        }
      } else if (e.key === 'Tab' && showSwitcher) {
        e.preventDefault();
        const wins = getWindows();
        if (wins.length) {
          const dir = e.shiftKey ? -1 : 1;
          setSwitchIndex((i) => (i + dir + wins.length) % wins.length);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && showSwitcher) {
        const wins = getWindows();
        if (wins.length) {
          activateWindow(wins[switchIndex].id);
        }
        setShowSwitcher(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showSwitcher, switchIndex]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onContextMenu={handleContextMenu}
      onClick={closeMenu}
    >
      <div className="absolute top-0 left-0 right-0 z-50">
        <Panel />
      </div>
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute text-center text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
          style={{ left: icon.x, top: icon.y, width: 80 }}
          tabIndex={0}
        >
          <div className="h-16 w-16 rounded bg-black bg-opacity-20" />
          <div>{icon.title}</div>
        </div>
      ))}
      <Dock />
      <HotCorner />
      {showSwitcher && <AppSwitcher index={switchIndex} />}
      <DesktopContextMenu
        position={menuPos}
        onClose={closeMenu}
        onArrange={handleArrange}
      />
    </div>
  );
};

export default Desktop;
