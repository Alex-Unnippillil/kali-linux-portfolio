import React, { useState, useEffect } from 'react';
import Modal from '../base/Modal';

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (save: boolean) => void;
  initialSave: boolean;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ open, onClose, onConfirm, initialSave }) => {
  const [save, setSave] = useState(initialSave);

  useEffect(() => {
    setSave(initialSave);
  }, [initialSave, open]);

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
        <div className="w-80 rounded bg-gray-800 p-4 text-white">
          <h2 className="mb-4 text-lg font-bold">Log out of this session?</h2>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <input
              id="save-session"
              type="checkbox"
              checked={save}
              onChange={() => setSave(!save)}
              aria-label="Save session for future logins"
            />
            <label htmlFor="save-session">Save session for future logins</label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded bg-gray-600 px-3 py-1"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(save)}
              className="rounded bg-red-600 px-3 py-1"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutModal;

