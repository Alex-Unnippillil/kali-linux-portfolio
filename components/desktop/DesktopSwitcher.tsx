"use client";

import React, { useEffect, useMemo, useRef } from "react";

export interface DesktopOption {
  id: string;
  name: string;
}

export interface DesktopSwitcherProps {
  desktops: readonly DesktopOption[];
  activeDesktopId: string;
  onDesktopChange?: (desktopId: string) => void;
  className?: string;
}

const DesktopSwitcher: React.FC<DesktopSwitcherProps> = ({
  desktops,
  activeDesktopId,
  onDesktopChange,
  className = "",
}) => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const previousDesktopIdRef = useRef<string | null>(null);

  const activeDesktop = useMemo(
    () => desktops.find((desktop) => desktop.id === activeDesktopId) ?? null,
    [desktops, activeDesktopId],
  );

  useEffect(() => {
    if (!liveRegionRef.current) return;
    if (previousDesktopIdRef.current === activeDesktopId) return;

    previousDesktopIdRef.current = activeDesktopId;

    const message = activeDesktop
      ? `Switched to ${activeDesktop.name} desktop`
      : "Desktop changed";

    // Clear the region first so assistive tech re-announces repeated updates.
    liveRegionRef.current.textContent = "";
    liveRegionRef.current.textContent = message;
  }, [activeDesktopId, activeDesktop]);

  const handleDesktopClick = (desktopId: string) => {
    if (desktopId === activeDesktopId) return;
    onDesktopChange?.(desktopId);
  };

  return (
    <div className={className}>
      <div
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      />
      <ul className="flex gap-2" role="tablist" aria-label="Virtual desktops">
        {desktops.map((desktop) => {
          const isActive = desktop.id === activeDesktopId;
          return (
            <li key={desktop.id}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleDesktopClick(desktop.id)}
                className={`px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange ${
                  isActive
                    ? "bg-ub-orange text-black"
                    : "bg-ub-cool-grey text-white hover:bg-ub-cool-grey/80"
                }`}
              >
                <span className="sr-only">
                  {isActive ? "Current desktop:" : "Switch to desktop"}
                </span>
                {" "}
                {desktop.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DesktopSwitcher;
