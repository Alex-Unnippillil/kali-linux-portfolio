import React from 'react';
import DrawerAppItem from './DrawerAppItem';
import type { DrawerAppMeta } from './types';

interface QuickLaunchSectionProps {
  apps: DrawerAppMeta[];
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onAddQuickLaunch: (id: string) => void;
  onRemoveQuickLaunch: (id: string) => void;
  pinnedSet: Set<string>;
  quickLaunchSet: Set<string>;
}

const QuickLaunchSection: React.FC<QuickLaunchSectionProps> = ({
  apps,
  onOpen,
  onPin,
  onUnpin,
  onAddQuickLaunch,
  onRemoveQuickLaunch,
  pinnedSet,
  quickLaunchSet,
}) => {
  if (apps.length === 0) return null;

  return (
    <section aria-label="Quick Launch" className="mb-4">
      <h2 className="text-xs uppercase tracking-wide text-ubt-grey mb-2">Quick Launch</h2>
      <div className="grid grid-cols-3 gap-2">
        {apps.map((app) => (
          <DrawerAppItem
            key={`quick-${app.id}`}
            app={app}
            onOpen={onOpen}
            onPin={onPin}
            onUnpin={onUnpin}
            onAddQuickLaunch={onAddQuickLaunch}
            onRemoveQuickLaunch={onRemoveQuickLaunch}
            isPinned={pinnedSet.has(app.id)}
            isQuickLaunch={quickLaunchSet.has(app.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default QuickLaunchSection;
