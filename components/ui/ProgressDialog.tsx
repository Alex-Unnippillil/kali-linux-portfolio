import React, { useEffect, useRef, useState } from 'react';
import Modal from '../base/Modal';
import ProgressBar from './ProgressBar';

interface ProgressDialogProps {
  /**
   * Whether the dialog is visible.
   */
  isOpen: boolean;
  /**
   * Called when the user cancels the operation.
   */
  onCancel: () => void;
}

export default function ProgressDialog({ isOpen, onCancel }: ProgressDialogProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Start a simulated operation that updates progress over time when opened.
  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    intervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 5, 100);
        if (next === 100 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return next;
      });
    }, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0);
    };
  }, [isOpen]);

  const handleCancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <div className="p-4 bg-white rounded border border-window shadow-window w-64 text-center space-y-4">
        <div>Processing… {Math.round(progress)}%</div>
        <ProgressBar progress={progress} className="w-full" />
        <button
          onClick={handleCancel}
          className="px-2 py-1 bg-gray-200 rounded"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
