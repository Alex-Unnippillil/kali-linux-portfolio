import React, { useState } from 'react';
import ContextMenu, { MenuItem } from '@/components/common/ContextMenu';
import BulkRenameDialog from './BulkRenameDialog';

export interface SelectionContextMenuProps {
  /** Reference to the element that triggers the menu */
  targetRef: React.RefObject<HTMLElement>;
  /** Names of currently selected files */
  selected: string[];
  /** Called when a rename operation is confirmed */
  onRename: (names: string[]) => void;
}

/**
 * Context menu used within the Thunar file manager when files are selected.
 * Currently only exposes a "Bulk Rename" action which opens the
 * `BulkRenameDialog`.
 */
const SelectionContextMenu: React.FC<SelectionContextMenuProps> = ({
  targetRef,
  selected,
  onRename,
}) => {
  const [showRename, setShowRename] = useState(false);

  const items: MenuItem[] = [
    {
      label: 'Bulk Rename…',
      onSelect: () => setShowRename(true),
    },
  ];

  return (
    <>
      <ContextMenu targetRef={targetRef} items={items} />
      {showRename && (
        <BulkRenameDialog
          files={selected}
          onRename={(names) => {
            onRename(names);
            setShowRename(false);
          }}
          onCancel={() => setShowRename(false)}
        />
      )}
    </>
  );
};

export default SelectionContextMenu;
