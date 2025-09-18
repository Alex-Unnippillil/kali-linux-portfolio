import React, { useMemo } from 'react';
import ContextMenu, { MenuItem } from '../../common/ContextMenu';

interface QrToolContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  text: string;
  png: string;
  svg: string;
  csv: string;
  hasBatch: boolean;
  invert: boolean;
  onCopyText: () => void;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
  onToggleInvert: () => void;
  onReset: () => void;
  onGenerateBatch: () => void;
  onClearBatch: () => void;
}

const QrToolContextMenu: React.FC<QrToolContextMenuProps> = ({
  targetRef,
  text,
  png,
  svg,
  csv,
  hasBatch,
  invert,
  onCopyText,
  onDownloadPng,
  onDownloadSvg,
  onToggleInvert,
  onReset,
  onGenerateBatch,
  onClearBatch,
}) => {
  const items = useMemo<MenuItem[]>(
    () => [
      {
        id: 'copy-text',
        label: 'Copy text',
        onSelect: onCopyText,
        disabled: text.trim() === '',
      },
      {
        id: 'download-png',
        label: 'Download PNG',
        onSelect: onDownloadPng,
        disabled: !png,
      },
      {
        id: 'download-svg',
        label: 'Download SVG',
        onSelect: onDownloadSvg,
        disabled: !svg,
      },
      {
        id: 'toggle-invert',
        label: invert ? 'Disable invert colors' : 'Invert colors',
        onSelect: onToggleInvert,
      },
      {
        id: 'reset-form',
        label: 'Reset form',
        onSelect: onReset,
        disabled:
          text.trim() === '' && csv.trim() === '' && !png && !svg && !hasBatch && !invert,
      },
      {
        id: 'generate-batch',
        label: 'Generate batch from CSV',
        onSelect: onGenerateBatch,
        disabled: csv.trim() === '',
      },
      { type: 'separator', id: 'batch', label: 'Batch management' },
      {
        id: 'clear-batch',
        label: 'Clear generated batch',
        onSelect: onClearBatch,
        disabled: !hasBatch,
      },
    ],
    [
      csv,
      hasBatch,
      invert,
      onClearBatch,
      onCopyText,
      onDownloadPng,
      onDownloadSvg,
      onGenerateBatch,
      onReset,
      onToggleInvert,
      png,
      svg,
      text,
    ],
  );

  return <ContextMenu targetRef={targetRef} items={items} />;
};

export default QrToolContextMenu;
