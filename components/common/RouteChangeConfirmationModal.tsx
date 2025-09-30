import React from 'react';
import Modal from '../base/Modal';

export interface ConfirmationDialogCopy {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface RouteChangeConfirmationModalProps extends ConfirmationDialogCopy {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const overlaySafeAreaStyle: React.CSSProperties = {
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
};

const RouteChangeConfirmationModal: React.FC<RouteChangeConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Leave',
  cancelLabel = 'Stay',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div
        className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 px-4 sm:items-center"
        style={overlaySafeAreaStyle}
        onClick={onCancel}
      >
        <div
          className="w-full max-w-md rounded-t-3xl border border-white/10 bg-gray-900 text-white shadow-2xl sm:rounded-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-3 px-6 pt-8 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="text-base leading-relaxed text-gray-300">{description}</p>
            ) : null}
          </div>
          <div className="grid gap-3 px-6 pb-8 pt-6 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-white/30 bg-transparent py-4 text-lg font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full rounded-full bg-red-600 py-4 text-lg font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RouteChangeConfirmationModal;

