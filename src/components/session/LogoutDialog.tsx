import React, { useState } from 'react';
import Modal from '@/components/base/Modal';

export interface SessionAction {
  label: string;
  onClick: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  actions: SessionAction[];
  saveSession?: () => void;
}

const LogoutDialog: React.FC<Props> = ({ open, onClose, actions, saveSession }) => {
  const [shouldSave, setShouldSave] = useState(false);

  const handleAction = (action: () => void) => {
    if (shouldSave && saveSession) {
      try {
        saveSession();
      } catch {
        // ignore save errors
      }
    }
    action();
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="bg-ub-cool-grey text-white rounded-md p-4 w-64">
        <h2 className="text-lg mb-4">Power options</h2>
        <div className="space-y-2">
          {actions.map((a) => (
            <button
              key={a.label}
              className="w-full text-left px-4 py-2 rounded hover:bg-ub-warm-grey hover:bg-opacity-20"
              onClick={() => handleAction(a.onClick)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={shouldSave}
            onChange={() => setShouldSave(!shouldSave)}
          />
          Save session
        </label>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1 border border-gray-700 rounded hover:bg-ub-warm-grey hover:bg-opacity-20"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutDialog;
