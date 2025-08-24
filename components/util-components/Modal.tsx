import React, { useEffect, useRef, useId } from 'react';
import messages from '../../messages/en.json';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);


  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
    } else {
      lastFocusedRef.current?.focus();
      return;
    }
    const dialog = dialogRef.current;
    const toFocus =
      dialog?.querySelector<HTMLElement>('[data-autofocus]') ||
      dialog?.querySelector<HTMLElement>(focusableSelector);
    toFocus?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
        const focusable =
          dialog?.querySelectorAll<HTMLElement>(focusableSelector);
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={dialogRef}
        className="bg-[var(--color-surface)] text-[var(--color-text)] p-4 rounded shadow-lg w-11/12 max-w-md"
      >
        {title && (
          <h2 id={titleId} className="text-lg font-bold mb-2">
            {title}
          </h2>
        )}
        <div>{children}</div>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-accent)] text-black rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text)]"
            data-autofocus
            aria-label={messages.modal.close}
          >
            {messages.modal.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
