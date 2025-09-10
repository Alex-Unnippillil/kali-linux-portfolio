import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { isBrowser } from '@/utils/env';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /**
     * Root element whose interaction should be disabled when the
     * modal is open. If a string is provided it is treated as an id.
     * Defaults to the Next.js root (`__next`).
     */
    overlayRoot?: string | HTMLElement;
    /**
     * Optional id of a heading element that labels the dialog.
     */
    ariaLabelledby?: string;
    /**
     * Optional className applied to the dialog element, allowing styling such
     * as positioning or background overlays.
     */
    className?: string;
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

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    overlayRoot,
    ariaLabelledby,
    className,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const portalRef = useRef<HTMLDivElement | null>(null);
    const inertRootRef = useRef<HTMLElement | null>(null);

    if (!portalRef.current && isBrowser()) {
        const el = document.createElement('div');
        portalRef.current = el;
        document.body.appendChild(el);
    }

    const getOverlayRoot = useCallback((): HTMLElement | null => {
        if (overlayRoot) {
            if (typeof overlayRoot === 'string') {
                return document.getElementById(overlayRoot);
            }
            return overlayRoot;
        }
        return document.getElementById('__next') || document.body;
    }, [overlayRoot]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const elements = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (!elements || elements.length === 0) return;
        const first = elements.item(0);
        const last = elements.item(elements.length - 1);
        if (!first || !last) return;
        const current = document.activeElement as HTMLElement;
        if (!e.shiftKey && current === last) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && current === first) {
            e.preventDefault();
            last.focus();
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        return () => {
            if (portalRef.current) {
                document.body.removeChild(portalRef.current);
                portalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        inertRootRef.current = getOverlayRoot();
        if (isOpen) {
            triggerRef.current = document.activeElement as HTMLElement;
            inertRootRef.current?.setAttribute('inert', '');
            const elements = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            if (elements && elements.length > 0) {
                elements[0].focus();
            } else {
                modalRef.current?.focus();
            }
        } else {
            inertRootRef.current?.removeAttribute('inert');
            triggerRef.current?.focus();
            triggerRef.current = null;
        }
        return () => {
            inertRootRef.current?.removeAttribute('inert');
        };
    }, [isOpen, getOverlayRoot]);

    if (!isOpen || !portalRef.current) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            ref={modalRef}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className={className}
        >
            {children}
        </div>,
        portalRef.current
    );
};

export default Modal;
