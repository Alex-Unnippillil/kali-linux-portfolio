'use client';

import React, { useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';

/**
 * Read-only view of all stored settings grouped by channel.
 * Updates automatically when settings change.
 */
export default function ChannelsInspector() {
  const {
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    colorBlind,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  } = useSettings();

  // Group settings into logical channels
  const channels = useMemo(
    () => ({
      appearance: { accent, wallpaper, density, fontScale, theme },
      accessibility: { reducedMotion, highContrast, colorBlind, largeHitAreas, haptics },
      gameplay: { pongSpin },
      privacy: { allowNetwork },
    }),
    [
      accent,
      wallpaper,
      density,
      fontScale,
      theme,
      reducedMotion,
      highContrast,
      colorBlind,
      largeHitAreas,
      haptics,
      pongSpin,
      allowNetwork,
    ]
  );

  return (
    <div className="text-sm">
      {Object.entries(channels).map(([channel, props]) => (
        <div key={channel} className="mb-4">
          <h3 className="font-bold capitalize">{channel}</h3>
          <ul className="pl-4">
            {Object.entries(props).map(([key, value]) => (
              <li key={key}>
                <span className="text-ubt-grey">{key}</span>: <span>{String(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

