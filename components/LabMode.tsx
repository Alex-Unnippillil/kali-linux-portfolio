"use client";

import { ChangeEvent, useId } from 'react';

import usePersistentState from '../hooks/usePersistentState';

interface Props {
  children: React.ReactNode;
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export default function LabMode({ children }: Props) {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    'lab-mode:enabled',
    false,
    isBoolean,
  );
  const idBase = useId();
  const headingId = `${idBase}-heading`;
  const descriptionId = `${idBase}-description`;
  const switchId = `${idBase}-toggle`;

  const onToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setEnabled(event.target.checked);
  };

  const descriptionText = enabled
    ? 'Lab Mode is on. All tools run with simulated data so nothing touches real systems—toggle the switch to leave the sandbox when you are ready.'
    : 'Lab Mode is off. Turn it on to practice with guided, simulated tooling; you can switch it back off here whenever you need to exit training mode.';

  return (
    <section className="w-full h-full" aria-labelledby={headingId}>
      <div
        className="bg-ub-yellow text-black p-3 text-xs sm:text-sm space-y-2"
        role="region"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <p id={headingId} className="font-semibold">
              Lab Mode safety controls
            </p>
            <p id={descriptionId} className="mt-1">
              {descriptionText}
            </p>
          </div>
          <label
            htmlFor={switchId}
            className="flex items-center gap-2 self-start rounded bg-ub-green px-2 py-1 text-black font-semibold"
          >
            <span>Toggle Lab Mode</span>
            <input
              id={switchId}
              type="checkbox"
              checked={enabled}
              onChange={onToggle}
              aria-describedby={descriptionId}
              aria-label="Toggle Lab Mode"
              className="h-4 w-4"
            />
          </label>
        </div>
      </div>
      {enabled && <div className="h-full overflow-auto">{children}</div>}
    </section>
  );
}

