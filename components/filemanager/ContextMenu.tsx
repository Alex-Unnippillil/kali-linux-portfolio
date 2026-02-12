import React, { useState } from 'react';
import ContextMenu, { MenuItem } from '../common/ContextMenu';
import ShareModal, { ShareSettings } from './ShareModal';

interface FileContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  folderId: string;
  folderName: string;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  targetRef,
  folderId,
  folderName,
}) => {
  const [showShare, setShowShare] = useState(false);

  const handleShareSave = (_settings: ShareSettings) => {
    const node = targetRef.current;
    if (node) {
      node.classList.add('relative');
      if (!node.querySelector('.shared-folder-badge')) {
        const badge = document.createElement('span');
        badge.className =
          'shared-folder-badge absolute bottom-0 right-0 text-xs';
        badge.textContent = '🔗';
        node.appendChild(badge);
      }
    }
  };

  const items: MenuItem[] = [
    {
      label: 'Share this Folder…',
      onSelect: () => setShowShare(true),
    },
  ];

  return (
    <>
      <ContextMenu targetRef={targetRef} items={items} />
      {showShare && (
        <ShareModal
          folderId={folderId}
          folderName={folderName}
          onClose={() => setShowShare(false)}
          onSave={handleShareSave}
        />
      )}
    </>
  );
};

export default FileContextMenu;
