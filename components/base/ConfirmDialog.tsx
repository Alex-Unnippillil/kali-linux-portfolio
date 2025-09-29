import { useEffect, useId, useRef } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    confirmButtonRef.current?.focus();
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 p-4">
        <div
          role="document"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="w-full max-w-md rounded-lg bg-slate-900 text-slate-100 shadow-2xl"
        >
          <div className="border-b border-slate-700 px-6 py-4">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
          </div>
          {description && (
            <div className="px-6 py-4">
              <p id={descriptionId} className="text-sm text-slate-300">
                {description}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              ref={confirmButtonRef}
              onClick={onConfirm}
              className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 focus:outline-none focus-visible:ring focus-visible:ring-blue-300"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
