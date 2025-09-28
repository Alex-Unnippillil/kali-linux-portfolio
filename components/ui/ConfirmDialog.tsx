"use client";

import React from 'react';
import Modal from '../base/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <Modal isOpen={open} onClose={onCancel}>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-70" aria-hidden="true" />
        <div
          role="document"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="relative z-10 w-80 max-w-full rounded-md border border-black border-opacity-20 bg-ub-cool-grey p-5 text-white shadow-lg"
        >
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-ubt-grey">
            {description}
          </p>
          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-transparent bg-gray-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-gray-300"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md border border-transparent bg-ub-orange px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-ub-orange"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
