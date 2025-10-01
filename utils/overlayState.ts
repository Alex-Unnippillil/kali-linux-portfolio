const OVERLAY_CLASS = 'ui-overlay-active';

const overlayTokens = new Set<string>();

const getBody = (): HTMLBodyElement | null => {
    if (typeof document === 'undefined') {
        return null;
    }
    return document.body;
};

const syncBodyClass = () => {
    const body = getBody();
    if (!body) return;
    if (overlayTokens.size > 0) {
        body.classList.add(OVERLAY_CLASS);
        body.dataset.overlayCount = String(overlayTokens.size);
    } else {
        body.classList.remove(OVERLAY_CLASS);
        delete body.dataset.overlayCount;
    }
};

export const setOverlayActive = (token: string, active: boolean) => {
    if (!token) return;
    if (active) {
        overlayTokens.add(token);
    } else {
        overlayTokens.delete(token);
    }
    syncBodyClass();
};

export const clearOverlayToken = (token: string) => {
    if (!token) return;
    overlayTokens.delete(token);
    syncBodyClass();
};

