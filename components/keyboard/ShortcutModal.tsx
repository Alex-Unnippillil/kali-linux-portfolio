import React from 'react';
import Modal from '@/components/base/Modal';
import shortcuts from '@/data/xfce4/default-shortcuts.json';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutModal({ isOpen, onClose }: Props) {
  const titleId = 'shortcut-modal-title';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="window-shadow bg-ub-cool-grey rounded-md w-80 max-h-[80vh] overflow-auto border border-black p-4">
        <h2 id={titleId} className="text-lg font-bold mb-2">
          Keyboard Shortcuts
        </h2>
        <ul className="space-y-1 mb-4">
          {shortcuts.map((s) => (
            <li key={s.command} className="flex justify-between px-2 py-1">
              <span className="flex-1 mr-2">{s.command}</span>
              <span className="font-mono">{s.keys}</span>
            </li>
          ))}
        </ul>
        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

