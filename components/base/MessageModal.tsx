import React from 'react';
import Modal from './Modal';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error';
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, title, message, type = 'success' }) => {
  if (!isOpen) return null;
  const color = type === 'success' ? 'text-green-400' : 'text-red-400';
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 p-4 rounded shadow max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg mb-2">{title}</h2>
          <p className={`mb-4 ${color}`}>{message}</p>
          <div className="text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MessageModal;
