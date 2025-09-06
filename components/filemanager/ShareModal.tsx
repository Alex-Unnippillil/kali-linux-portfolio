import React, { useState } from 'react';
import Modal from '../base/Modal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ShareModal presents file sharing options and a Samba requirement notice.
 */
export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-4 bg-white rounded shadow max-w-sm">
          {/* Placeholder for future share options */}
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

