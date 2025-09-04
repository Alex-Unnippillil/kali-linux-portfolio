import React from 'react';
import Modal from '../base/Modal';
import ProgressBar from './ProgressBar';

interface ProgressModalProps {
  open: boolean;
  progress: number;
  onCancel: () => void;
  title?: string;
}

export default function ProgressModal({ open, progress, onCancel, title }: ProgressModalProps) {
  return (
    <Modal isOpen={open} onClose={onCancel}>
      <div className="p-4 bg-ub-dark-grey text-white rounded shadow-lg space-y-4" role="alertdialog">
        {title && <div className="font-bold">{title}</div>}
        <ProgressBar progress={progress} className="w-full" />
        <div className="flex justify-end">
          <button onClick={onCancel} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

