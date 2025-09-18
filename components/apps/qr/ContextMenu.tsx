import React, { useMemo } from 'react';
import ContextMenu, { MenuItem } from '../../common/ContextMenu';

interface QrContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  hasResult: boolean;
  hasPreview: boolean;
  torchOn: boolean;
  torchAvailable: boolean;
  onCopyResult: () => void;
  onDownloadPreview: () => void;
  onClearResult: () => void;
  onSwitchCamera: () => void;
  onToggleTorch: () => void;
}

const QrContextMenu: React.FC<QrContextMenuProps> = ({
  targetRef,
  hasResult,
  hasPreview,
  torchOn,
  torchAvailable,
  onCopyResult,
  onDownloadPreview,
  onClearResult,
  onSwitchCamera,
  onToggleTorch,
}) => {
  const items = useMemo<MenuItem[]>(
    () => [
      {
        id: 'copy-result',
        label: 'Copy result',
        onSelect: onCopyResult,
        disabled: !hasResult,
      },
      {
        id: 'download-preview',
        label: 'Download preview (PNG)',
        onSelect: onDownloadPreview,
        disabled: !hasPreview,
      },
      {
        id: 'clear-result',
        label: 'Clear result',
        onSelect: onClearResult,
        disabled: !hasResult,
      },
      { type: 'separator', id: 'camera-controls', label: 'Camera controls' },
      {
        id: 'switch-camera',
        label: 'Switch camera',
        onSelect: onSwitchCamera,
      },
      {
        id: 'toggle-torch',
        label: torchOn ? 'Turn off flashlight' : 'Turn on flashlight',
        onSelect: onToggleTorch,
        disabled: !torchAvailable,
      },
    ],
    [
      hasPreview,
      hasResult,
      onClearResult,
      onCopyResult,
      onDownloadPreview,
      onSwitchCamera,
      onToggleTorch,
      torchAvailable,
      torchOn,
    ],
  );

  return <ContextMenu targetRef={targetRef} items={items} />;
};

export default QrContextMenu;
