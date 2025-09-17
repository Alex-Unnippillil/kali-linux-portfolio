import React, { useCallback } from 'react';
import UbuntuApp from '../../../base/ubuntu_app';
import { useDrawerLongPress } from './useDrawerLongPress';
import type { DrawerLongPressEvent } from './useDrawerLongPress';

type DrawerAppTileProps = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  onOpen: (id: string) => void;
  className?: string;
};

const DrawerAppTile: React.FC<DrawerAppTileProps> = ({ id, title, icon, disabled, onOpen, className }) => {
  const handleOpen = useCallback(() => {
    onOpen(id);
  }, [id, onOpen]);

  const handleLongPress = useCallback((event: DrawerLongPressEvent) => {
    const contextTarget = event.target;
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: window.screenX + event.clientX,
      screenY: window.screenY + event.clientY,
    });

    contextTarget.dispatchEvent(contextMenuEvent);
  }, []);

  const longPressHandlers = useDrawerLongPress<HTMLDivElement>(handleLongPress);

  return (
    <div className={className} {...longPressHandlers}>
      <UbuntuApp id={id} icon={icon} name={title} displayName={title} disabled={disabled} openApp={handleOpen} />
    </div>
  );
};

export default DrawerAppTile;
