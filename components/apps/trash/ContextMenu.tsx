import React, { useMemo } from 'react';
import ContextMenu, { MenuItem } from '../../common/ContextMenu';

interface TrashContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  hasSelection: boolean;
  hasItems: boolean;
  selectedTitle?: string;
  onRestore: () => void;
  onDelete: () => void;
  onRestoreAll: () => void;
  onEmpty: () => void;
  onOpen?: (event: MouseEvent) => boolean | void;
}

const TrashContextMenu: React.FC<TrashContextMenuProps> = ({
  targetRef,
  hasSelection,
  hasItems,
  selectedTitle,
  onRestore,
  onDelete,
  onRestoreAll,
  onEmpty,
  onOpen,
}) => {
  const items = useMemo<MenuItem[]>(
    () => [
      {
        id: 'restore',
        label: selectedTitle ? `Restore "${selectedTitle}"` : 'Restore',
        onSelect: onRestore,
        disabled: !hasSelection,
      },
      {
        id: 'delete',
        label: selectedTitle ? `Delete "${selectedTitle}"` : 'Delete',
        onSelect: onDelete,
        disabled: !hasSelection,
        danger: true,
      },
      { type: 'separator', id: 'bulk', label: 'Bulk actions' },
      {
        id: 'restore-all',
        label: 'Restore all',
        onSelect: onRestoreAll,
        disabled: !hasItems,
      },
      {
        id: 'empty',
        label: 'Empty trash',
        onSelect: onEmpty,
        disabled: !hasItems,
        danger: true,
      },
    ],
    [
      hasItems,
      hasSelection,
      onDelete,
      onEmpty,
      onRestore,
      onRestoreAll,
      selectedTitle,
    ],
  );

  return <ContextMenu targetRef={targetRef} items={items} onOpen={onOpen} />;
};

export default TrashContextMenu;
