import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import useOverlay from '../../hooks/useOverlay';

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

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, overlayRoot }) => {
    const overlay = useOverlay();
    const modalRef = useRef<HTMLDivElement | null>(null);
    const overlayIdRef = useRef<string | null>(null);

    const assignModalNode = useCallback(
        (node: HTMLDivElement | null) => {
            modalRef.current = node;
            if (!node || !isOpen) return;
            const elements = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            const firstElement = elements[0] ?? node;
            try {
                firstElement.focus({ preventScroll: true });
            } catch {
                firstElement.focus();
            }
        },
        [isOpen],
    );

    const inertTarget = useMemo(() => {
        if (overlayRoot) {
            if (typeof overlayRoot === 'string') {
                return () => document.getElementById(overlayRoot);
            }
            return () => overlayRoot;
        }
        return () => document.getElementById('__next') || document.body;
    }, [overlayRoot]);

    const options = useMemo(
        () => ({
            trapFocus: true,
            inertRoot: inertTarget,
            initialFocus: () => {
                const node = modalRef.current;
                if (!node) return null;
                const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
                return focusable ?? node;
            },
        }),
        [inertTarget],
    );

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, onClose]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const focusFirst = () => {
            const node = modalRef.current;
            if (!node) return;
            const elements = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            const firstElement = elements[0] ?? node;
            try {
                firstElement.focus({ preventScroll: true });
            } catch {
                firstElement.focus();
            }
        };
        focusFirst();
        const id = setTimeout(focusFirst, 0);
        return () => clearTimeout(id);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            if (overlayIdRef.current) {
                overlay.pop(overlayIdRef.current);
                overlayIdRef.current = null;
            }
            return;
        }

        const node = (
            <div role="dialog" aria-modal="true" ref={assignModalNode} tabIndex={-1}>
                {children}
            </div>
        );

        if (overlayIdRef.current) {
            overlay.update(overlayIdRef.current, node, options);
        } else {
            overlayIdRef.current = overlay.push(node, options);
        }

        return () => {
            if (overlayIdRef.current) {
                overlay.pop(overlayIdRef.current);
                overlayIdRef.current = null;
            }
        };
    }, [assignModalNode, children, isOpen, overlay, options]);

    useEffect(() => () => {
        if (overlayIdRef.current) {
            overlay.pop(overlayIdRef.current);
            overlayIdRef.current = null;
        }
    }, [overlay]);

    return null;
};

export default Modal;
