import React, { useState } from 'react';
import Modal from '../base/Modal';
import { useShares, toggleShare } from '../../hooks/useShares';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Path of the folder being shared */
  path: string;
}

/**
 * ShareModal presents file sharing options and a Samba requirement notice.
 * It also allows toggling the share state for the provided path.
 */
export default function ShareModal({ isOpen, onClose, path }: ShareModalProps) {
  const [showInfo, setShowInfo] = useState(false);
  const shares = useShares();
  const isShared = shares.includes(path);

  const handleToggle = () => {
    toggleShare(path);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-4 bg-white rounded shadow max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Share this folder</h2>
          <button
            type="button"
            className="px-3 py-1 bg-ubt-blue text-white rounded"
            onClick={handleToggle}
          >
            {isShared ? 'Unshare' : 'Share'}
          </button>
          <p className="mt-4 text-sm">
            Requires Samba.{' '}
            <button
              type="button"
              className="underline text-ubt-blue"
              onClick={() => setShowInfo(true)}
            >
              Learn more
            </button>
          </p>
        </div>
      </Modal>

      <Modal isOpen={showInfo} onClose={() => setShowInfo(false)}>
        <div className="p-4 bg-white rounded shadow max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Samba required</h2>
          <p className="text-sm mb-2">
            To enable network file sharing, install Samba:
          </p>
          <pre className="bg-gray-100 p-2 text-xs rounded">sudo apt install samba</pre>
          <p className="text-sm mt-2">
            Configure shares in <code>/etc/samba/smb.conf</code> and restart the service.
          </p>
          <button
            type="button"
            className="mt-4 px-3 py-1 bg-ubt-blue text-white rounded"
            onClick={() => setShowInfo(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}

