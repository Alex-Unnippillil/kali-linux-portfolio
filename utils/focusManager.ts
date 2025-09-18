export type FocusFallback = (() => HTMLElement | null | undefined) | HTMLElement | null | undefined;

const focusTargets = new Map<string, HTMLElement>();

const resolveElement = (element?: HTMLElement | null): HTMLElement | null => {
    if (!element) return null;
    return element instanceof HTMLElement ? element : null;
};

const resolveActiveElement = (): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const active = document.activeElement;
    return active instanceof HTMLElement ? active : null;
};

const attemptFocus = (element: HTMLElement | null | undefined): HTMLElement | null => {
    if (!element || typeof element.focus !== 'function') return null;
    element.focus();
    return element;
};

export const storeFocusTarget = (key: string, element?: HTMLElement | null): void => {
    if (!key) return;
    const target = resolveElement(element) ?? resolveActiveElement();
    if (target) {
        focusTargets.set(key, target);
    }
};

export const clearFocusTarget = (key: string): void => {
    focusTargets.delete(key);
};

export const restoreFocusTarget = (key: string, fallback?: FocusFallback): HTMLElement | null => {
    if (!key) return null;
    const stored = focusTargets.get(key) ?? null;
    focusTargets.delete(key);

    if (stored && stored.isConnected) {
        const focused = attemptFocus(stored);
        if (focused && focused === document.activeElement) {
            return focused;
        }
    }

    let candidate: HTMLElement | null = null;
    if (typeof fallback === 'function') {
        candidate = fallback() ?? null;
    } else if (fallback) {
        candidate = fallback;
    }

    if (candidate) {
        const focused = attemptFocus(candidate);
        if (focused && focused === document.activeElement) {
            return focused;
        }
    }

    const defaultTarget = resolveActiveElement();
    if (defaultTarget) {
        const focused = attemptFocus(defaultTarget);
        if (focused && focused === document.activeElement) {
            return focused;
        }
    }

    return null;
};

export const getStoredFocusTarget = (key: string): HTMLElement | null => {
    return focusTargets.get(key) ?? null;
};
