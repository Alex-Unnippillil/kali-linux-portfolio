import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    const root = document.getElementById('__next');
    if (isOpen) {
      prevFocus.current = document.activeElement;
      root?.setAttribute('inert', '');
      const focusables = ref.current?.querySelectorAll<HTMLElement>(focusableSelectors);
      focusables && focusables[0]?.focus();
    } else {
      root?.removeAttribute('inert');
      (prevFocus.current as HTMLElement | null)?.focus?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const focusables = ref.current?.querySelectorAll<HTMLElement>(focusableSelectors);
        if (!focusables || focusables.length === 0) return;
        const elements = Array.from(focusables);
        const index = elements.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey ? (index - 1 + elements.length) % elements.length : (index + 1) % elements.length;
        elements[next].focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" ref={ref} className="absolute rounded-md top-1/2 left-1/2 text-center text-white font-light text-sm bg-ub-cool-grey transform -translate-y-1/2 -translate-x-1/2">
      {children}
    </div>
  );
};

export default Modal;
