"use client";

import React from "react";
import WhiskerMenu from "../menu/WhiskerMenu";
import PanelClock from "../util-components/PanelClock";
import Status from "../util-components/status";

interface Props {
  /** Optional title shown in the center of the panel */
  title?: string;
}

/**
 * A simple top panel for desktop-style layouts.
 * Displays an application menu on the left, the current window title in the
 * center and various system indicators on the right. The title and clock are
 * hidden on very small screens to keep the panel usable on mobile devices.
 */
export default function TopPanel({ title }: Props) {
  return (
    <header className="flex items-center justify-between w-full bg-ub-grey text-ubt-grey h-8 md:h-6 lg:h-8 px-2 md:px-1 lg:px-2 text-sm md:text-xs lg:text-sm sticky top-0 z-40 rtl:flex-row-reverse">
      {/* App menu */}
      <div className="flex items-center">
        <WhiskerMenu />
      </div>

      {/* Window title */}
      <div className="flex-1 flex justify-center">
        {title && (
          <span className="hidden sm:block truncate max-w-xs text-center" data-testid="window-title">
            {title}
          </span>
        )}
      </div>

      {/* System indicators */}
      <div className="flex items-center space-x-2 md:space-x-1 lg:space-x-2 rtl:flex-row-reverse rtl:space-x-reverse" aria-label="System indicators">
        <div className="hidden sm:block">
          <PanelClock />
        </div>
        <Status />
      </div>
    </header>
  );
}

