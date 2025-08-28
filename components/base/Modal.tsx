import React, { useEffect, useRef, useCallback } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'area[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
].join(',');

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }
        if (e.key !== 'Tab') return;
        const elements = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (!elements || elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        const current = document.activeElement as HTMLElement;
        if (!e.shiftKey && current === last) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && current === first) {
            e.preventDefault();
            last.focus();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            triggerRef.current = document.activeElement as HTMLElement;
            const elements = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            if (elements && elements.length > 0) {
                elements[0].focus();
            } else {
                modalRef.current?.focus();
            }
        } else {
            triggerRef.current?.focus();
            triggerRef.current = null;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            ref={modalRef}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {children}
        </div>
    );
};

export default Modal;
