import React, { useState } from 'react';
import Modal from '../base/Modal';

interface PolicyKitPromptProps {
  open: boolean;
  onClose: () => void;
}

const PolicyKitPrompt: React.FC<PolicyKitPromptProps> = ({ open, onClose }) => {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = () => {
    setMessage('Not supported in demo');
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
        <div className="w-80 rounded bg-gray-800 p-4 text-white">
          <h2 className="mb-2 text-lg font-bold">Authentication Required</h2>
          {message ? (
            <>
              <p className="mb-4 text-sm">{message}</p>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-600 px-3 py-1"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm">
                Enter your password to perform administrative tasks.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 w-full rounded bg-black p-2 text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-600 px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuth}
                  className="rounded bg-blue-600 px-3 py-1"
                >
                  Authenticate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PolicyKitPrompt;

