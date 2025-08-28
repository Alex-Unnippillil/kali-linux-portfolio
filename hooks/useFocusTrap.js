import { useEffect } from 'react';
function getFocusableElements(container) {
    const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(container.querySelectorAll(selectors.join(',')));
}
export default function useFocusTrap(ref, active = true) {
    useEffect(() => {
        const node = ref.current;
        if (!node || !active)
            return;
        const handleKeyDown = (e) => {
            if (e.key !== 'Tab')
                return;
            const focusable = getFocusableElements(node);
            if (focusable.length === 0)
                return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            }
            else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        const handleFocus = (e) => {
            if (!node.contains(e.target)) {
                const focusable = getFocusableElements(node);
                focusable[0]?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focusin', handleFocus);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('focusin', handleFocus);
        };
    }, [ref, active]);
}
