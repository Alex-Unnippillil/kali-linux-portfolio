import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-ub-cool-grey text-white p-4 rounded shadow-lg min-w-[300px]">
        {title && <h2 className="text-lg mb-2">{title}</h2>}
        {children}
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-700 rounded focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
