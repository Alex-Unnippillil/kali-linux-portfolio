import React from 'react';
import ContextMenu, { MenuItem } from '../common/ContextMenu';

interface DesktopMenuProps {
  /** Element that should trigger the desktop context menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Handler for creating a new folder on the desktop */
  onNewFolder: () => void;
  /** Open wallpaper settings */
  onChangeWallpaper: () => void;
  /** Open display settings */
  onDisplaySettings: () => void;
}

const DesktopMenu: React.FC<DesktopMenuProps> = ({
  targetRef,
  onNewFolder,
  onChangeWallpaper,
  onDisplaySettings,
}) => {
  const items: MenuItem[] = [
    {
      label: <span className="ml-5">New Folder</span>,
      onSelect: onNewFolder,
    },
    {
      label: <span className="ml-5">Change Wallpaper</span>,
      onSelect: onChangeWallpaper,
    },
    {
      label: <span className="ml-5">Display Settings</span>,
      onSelect: onDisplaySettings,
    },
  ];

  return <ContextMenu targetRef={targetRef} items={items} />;
};

export default DesktopMenu;

