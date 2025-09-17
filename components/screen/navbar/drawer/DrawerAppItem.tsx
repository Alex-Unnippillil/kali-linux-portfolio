import React, { useMemo, useRef } from 'react';
import UbuntuApp from '../../../base/ubuntu_app';
import ContextMenu, { MenuItem } from '../../../common/ContextMenu';
import type { DrawerAppMeta } from './types';

interface DrawerAppItemProps {
  app: DrawerAppMeta;
  className?: string;
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onAddQuickLaunch: (id: string) => void;
  onRemoveQuickLaunch: (id: string) => void;
  isPinned: boolean;
  isQuickLaunch: boolean;
}

const DrawerAppItem: React.FC<DrawerAppItemProps> = ({
  app,
  className = '',
  onOpen,
  onPin,
  onUnpin,
  onAddQuickLaunch,
  onRemoveQuickLaunch,
  isPinned,
  isQuickLaunch,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);

  const items: MenuItem[] = useMemo(() => {
    const menuItems: MenuItem[] = [];

    if (isPinned) {
      menuItems.push({
        label: 'Unpin from Favorites',
        onSelect: () => onUnpin(app.id),
      });
    } else {
      menuItems.push({
        label: 'Pin to Favorites',
        onSelect: () => onPin(app.id),
      });
    }

    menuItems.push({
      label: isQuickLaunch ? 'Remove from Quick Launch' : 'Add to Quick Launch',
      onSelect: () => (isQuickLaunch ? onRemoveQuickLaunch(app.id) : onAddQuickLaunch(app.id)),
    });

    return menuItems;
  }, [app.id, isPinned, isQuickLaunch, onAddQuickLaunch, onPin, onRemoveQuickLaunch, onUnpin]);

  return (
    <div ref={targetRef} className={`relative ${className}`}>
      <UbuntuApp
        id={app.id}
        icon={app.icon}
        name={app.title}
        displayName={app.displayName}
        openApp={() => onOpen(app.id)}
        disabled={app.disabled}
        prefetch={app.screen?.prefetch}
      />
      <ContextMenu targetRef={targetRef} items={items} />
    </div>
  );
};

export default DrawerAppItem;
