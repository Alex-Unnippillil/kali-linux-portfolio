import React from 'react';
import Toast from './Toast';
import { ToastQueueItem } from '../../hooks/useToastQueue';

interface ToastStackProps {
  toasts: ToastQueueItem[];
  onClose: (id: string) => void;
  onAction: (id: string) => Promise<void> | void;
}

const ToastStack: React.FC<ToastStackProps> = ({ toasts, onClose, onAction }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 flex-col items-center space-y-3 px-4">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onClose={() => onClose(toast.id)}
          onAction={toast.actionAvailable ? () => void onAction(toast.id) : undefined}
          duration={toast.duration}
          count={toast.count}
          isActionPending={toast.isActionPending}
          actionAvailable={toast.actionAvailable}
        />
      ))}
    </div>
  );
};

export default ToastStack;
