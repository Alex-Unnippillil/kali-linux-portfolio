import React, { useState } from 'react';
import { safeLocalStorage } from '../../utils/safeStorage';

export interface ShareSettings {
  name: string;
  guestOk: boolean;
  comment: string;
}

interface ShareModalProps {
  folderId: string;
  folderName: string;
  onClose: () => void;
  onSave?: (settings: ShareSettings) => void;
}

const STORAGE_KEY = 'filemanager-shares';

const ShareModal: React.FC<ShareModalProps> = ({
  folderId,
  folderName,
  onClose,
  onSave,
}) => {
  const [shareName, setShareName] = useState(folderName);
  const [guestOk, setGuestOk] = useState(false);
  const [comment, setComment] = useState('');

  const save = () => {
    const settings: ShareSettings = { name: shareName, guestOk, comment };
    try {
      const raw = safeLocalStorage?.getItem(STORAGE_KEY) ?? '{}';
      const data = JSON.parse(raw);
      data[folderId] = settings;
      safeLocalStorage?.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
    onSave?.(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-4 rounded w-80">
        <h2 className="text-lg mb-2">Share Folder</h2>
        <label className="block mb-2">
          <span className="block text-sm mb-1">Share name</span>
          <input
            type="text"
            value={shareName}
            onChange={(e) => setShareName(e.target.value)}
            className="w-full px-2 py-1 text-black rounded"
          />
        </label>
        <label className="block mb-2">
          <input
            type="checkbox"
            checked={guestOk}
            onChange={(e) => setGuestOk(e.target.checked)}
            className="mr-2"
          />
          Guest OK
        </label>
        <label className="block mb-4">
          <span className="block text-sm mb-1">Comment</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-2 py-1 text-black rounded"
            rows={3}
          />
        </label>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-600 rounded">
            Cancel
          </button>
          <button onClick={save} className="px-3 py-1 bg-blue-600 rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
