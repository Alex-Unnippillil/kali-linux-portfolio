'use client';

import { useId } from 'react';
import Modal from '../base/Modal';

interface Action {
  label: string;
  onClick: () => void;
}

interface SystemDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  primary: Action;
  secondary?: Action;
}

export default function SystemDialog({
  isOpen,
  title,
  message,
  primary,
  secondary,
}: SystemDialogProps) {
  const headingId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={primary.onClick}
      ariaLabelledby={headingId}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div className="bg-ub-cool-grey border border-window shadow-window p-4 text-white w-80 space-y-4">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <p>{message}</p>
        <div className="flex justify-end gap-2 flex-row-reverse">
          <button
            type="button"
            onClick={primary.onClick}
            className="px-3 py-1 bg-black bg-opacity-50 rounded"
          >
            {primary.label}
          </button>
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="px-3 py-1 bg-black bg-opacity-50 rounded"
            >
              {secondary.label}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

