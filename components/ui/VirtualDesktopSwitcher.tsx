import { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualDesktops } from '../../hooks/useVirtualDesktops';

export default function VirtualDesktopSwitcher() {
  const { activeDesktop, desktops, switchDesktop } = useVirtualDesktops();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const delta = e.key === 'ArrowLeft' ? -1 : 1;
          switchDesktop(activeDesktop + delta);
          setVisible(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setVisible(false), 800);
        }
      }
    },
    [activeDesktop, switchDesktop]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleKeyDown]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex space-x-4 bg-black/60 p-4 rounded-lg">
        {Array.from({ length: desktops }).map((_, idx) => (
          <div
            key={idx}
            className={`h-4 w-8 sm:h-6 sm:w-12 rounded-sm transition-transform duration-300 ${
              idx === activeDesktop ? 'bg-white scale-125' : 'bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

