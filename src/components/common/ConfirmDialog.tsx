import React, { useId } from 'react';
import Modal from '@/components/base/Modal';

interface ConfirmDialogProps {
  open: boolean;
  message: React.ReactNode;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  message,
  title,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const headingId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      ariaLabelledby={title ? headingId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-gray-800 text-white p-4 rounded shadow-lg w-80 max-w-full">
        {title && (
          <h2 id={headingId} className="text-lg mb-2">
            {title}
          </h2>
        )}
        <div className="mb-4 text-sm">{message}</div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 rounded bg-danger hover:bg-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

