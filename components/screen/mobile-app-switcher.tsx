import React from 'react';
import Image from 'next/image';

type WindowMeta = {
  id: string;
  title: string;
  icon?: string;
};

interface MobileAppSwitcherProps {
  windows: WindowMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenApplications: () => void;
  onOpenSwitcher: () => void;
}

function normaliseIconPath(icon?: string) {
  if (!icon) return undefined;
  return icon.startsWith('./') ? icon.replace('./', '/') : icon;
}

const MobileAppSwitcher: React.FC<MobileAppSwitcherProps> = ({
  windows,
  activeId,
  onSelect,
  onOpenApplications,
  onOpenSwitcher,
}) => {
  const activeIndex = activeId ? windows.findIndex((window) => window.id === activeId) : -1;
  const hasActive = activeIndex >= 0;
  const activeWindow = hasActive ? windows[activeIndex] : null;
  const cycleAvailable = hasActive && windows.length > 1;

  const getRelativeId = (offset: number) => {
    if (!hasActive) return null;
    const index = (activeIndex + offset + windows.length) % windows.length;
    return windows[index]?.id ?? null;
  };

  const previousId = cycleAvailable ? getRelativeId(-1) : null;
  const nextId = cycleAvailable ? getRelativeId(1) : null;

  const handleSelect = (id: string | null) => {
    if (!id) return;
    onSelect(id);
  };

  const activeIcon = normaliseIconPath(activeWindow?.icon);

  return (
    <header
      data-testid="mobile-app-switcher"
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2 bg-black bg-opacity-70 backdrop-blur text-white"
    >
      <button
        type="button"
        aria-label="Show applications"
        onClick={onOpenApplications}
        className="flex items-center gap-2 rounded-full bg-white bg-opacity-10 px-3 py-1 text-sm font-medium"
      >
        <Image
          src="/themes/Yaru/system/view-app-grid-symbolic.svg"
          alt="Open applications"
          width={20}
          height={20}
          className="h-5 w-5"
          sizes="20px"
        />
      </button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous app"
          onClick={() => handleSelect(previousId)}
          disabled={!previousId}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white bg-opacity-10 text-lg disabled:opacity-40"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label={activeWindow ? `Switch window (${activeWindow.title})` : 'No apps open'}
          onClick={windows.length ? onOpenSwitcher : undefined}
          disabled={!windows.length}
          className="flex min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-full bg-white bg-opacity-10 px-3 py-1 text-sm font-semibold disabled:opacity-40"
        >
          {activeIcon && (
            <Image src={activeIcon} alt="" width={20} height={20} className="h-5 w-5" sizes="20px" />
          )}
          <span className="truncate text-sm font-medium">
            {activeWindow ? activeWindow.title : 'No apps open'}
          </span>
        </button>
        <button
          type="button"
          aria-label="Next app"
          onClick={() => handleSelect(nextId)}
          disabled={!nextId}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white bg-opacity-10 text-lg disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </header>
  );
};

export default MobileAppSwitcher;
