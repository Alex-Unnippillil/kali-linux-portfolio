'use client';

import React from 'react';
import { focusSkipTarget, useFocusAnnouncement, useSkipTargets } from './FocusManager';

const buttonBaseClasses =
  'sr-only focus:not-sr-only focus:absolute focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded focus:bg-ub-cool-grey focus:bg-opacity-90 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400';

const formatShortcut = (shortcut?: string) => {
  if (!shortcut) return undefined;
  return shortcut.replace(/Control/g, 'Ctrl');
};

const SkipLinks: React.FC = () => {
  const targets = useSkipTargets();
  const announcement = useFocusAnnouncement();

  return (
    <>
      {targets.map((target, index) => {
        const available = target.isAvailable ? target.isAvailable() : true;
        const shortcutLabel = formatShortcut(target.shortcut);
        const lowerLabel = target.label.toLowerCase();
        return (
          <button
            key={target.id}
            type="button"
            className={buttonBaseClasses}
            style={{ top: `${8 + index * 44}px` }}
            onClick={(event) => {
              event.preventDefault();
              focusSkipTarget(target.id, {
                fallbackAnnouncement: available
                  ? `Unable to move focus to the ${lowerLabel}.`
                  : `The ${lowerLabel} is not available right now.`,
              });
            }}
            aria-disabled={!available}
            aria-keyshortcuts={target.shortcut}
          >
            {`Skip to ${target.label}`}
            {shortcutLabel ? (
              <span className="ml-2 text-xs opacity-80" aria-hidden="true">
                {shortcutLabel}
              </span>
            ) : null}
            {!available ? <span className="sr-only"> (currently unavailable)</span> : null}
          </button>
        );
      })}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-focus-announcer>
        {announcement.message}
      </div>
    </>
  );
};

export default SkipLinks;
