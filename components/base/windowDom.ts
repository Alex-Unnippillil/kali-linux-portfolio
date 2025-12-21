export const scheduleTimeout = (callback: () => void, delay: number) => {
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
        return window.setTimeout(callback, delay);
    }
    return setTimeout(callback, delay);
};

export const clearScheduledTimeout = (handle: ReturnType<typeof setTimeout> | number | null) => {
    if (handle == null) return;
    if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
        window.clearTimeout(handle as number);
    } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
    }
};

export const scheduleAnimationFrame = (callback: FrameRequestCallback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
};

export const cancelScheduledAnimationFrame = (handle: number | null) => {
    if (handle == null) return;
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(handle);
    } else {
        clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
    }
};

export const getOverlayRoot = (overlayRoot?: string | HTMLElement | null) => {
    if (overlayRoot) {
        if (typeof overlayRoot === 'string') {
            return document.getElementById(overlayRoot);
        }
        return overlayRoot;
    }
    return document.getElementById('__next');
};

export const toggleInert = (node: HTMLElement | null, inert: boolean) => {
    if (!node) return;
    if (inert) {
        node.setAttribute('inert', '');
    } else {
        node.removeAttribute('inert');
    }
};

export const safelyRestoreFocus = (element: Element | null | undefined) => {
    if (element && typeof (element as HTMLElement).focus === 'function') {
        try {
            (element as HTMLElement).focus();
        } catch (error) {
            // ignore focus errors
        }
    }
};
