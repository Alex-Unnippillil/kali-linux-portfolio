import React from 'react';
import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  useRegisterActions,
} from 'kbar';
import apps from '../../apps.config';
import { useSettings } from '../../hooks/useSettings';

function Results() {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="px-2 py-1 text-xs uppercase opacity-50">{item}</div>
        ) : (
          <div className={`px-4 py-2 ${active ? 'bg-blue-100' : ''}`}>{item.name}</div>
        )
      }
    />
  );
}

export default function CommandPalette() {
  const { wallpaper, setWallpaper } = useSettings();
  const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

  useRegisterActions(
    [
      {
        id: 'open-settings',
        name: 'Open Settings',
        keywords: 'settings',
        perform: () => window.desktopApi?.openApp?.('settings'),
      },
      {
        id: 'change-wallpaper',
        name: 'Change Wallpaper',
        keywords: 'background wallpaper',
        perform: () => {
          const index = wallpapers.indexOf(wallpaper);
          const next = wallpapers[(index + 1) % wallpapers.length];
          setWallpaper(next);
        },
      },
      ...apps.map((app) => ({
        id: `launch-${app.id}`,
        name: `Launch ${app.title}`,
        section: 'Apps',
        perform: () => window.desktopApi?.openApp?.(app.id),
      })),
      ...apps.map((app) => ({
        id: `focus-${app.id}`,
        name: `Focus ${app.title}`,
        section: 'Windows',
        perform: () => window.desktopApi?.focusApp?.(app.id),
      })),
    ],
    [wallpaper]
  );

  return (
    <KBarPortal>
      <KBarPositioner className="z-50 bg-black/80 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-md bg-white text-black rounded overflow-hidden shadow-lg">
          <KBarSearch className="p-4 w-full outline-none" />
          <Results />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

