const getDesktopRoot = () => {
    if (typeof document === 'undefined') {
        return null;
    }
    return document.getElementById('window-area') || document.getElementById('desktop');
};

export const measureDesktopRect = () => {
    const container = getDesktopRoot();
    return container ? container.getBoundingClientRect() : null;
};

export const computeMovementBounds = (containerRect, windowSize = {}) => {
    const containerWidth = containerRect?.width ?? 0;
    const containerHeight = containerRect?.height ?? 0;
    const windowWidth = windowSize?.width ?? 0;
    const windowHeight = windowSize?.height ?? 0;

    return {
        left: 0,
        top: 0,
        right: Math.max(containerWidth - windowWidth, 0),
        bottom: Math.max(containerHeight - windowHeight, 0),
    };
};

const clampValue = (value, min, max) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    return Math.min(Math.max(safeValue, safeMin), safeMax);
};

export const clampPosition = (position = {}, bounds = {}) => {
    const left = bounds.left ?? 0;
    const top = bounds.top ?? 0;
    const right = bounds.right ?? left;
    const bottom = bounds.bottom ?? top;

    return {
        x: clampValue(position.x, left, right),
        y: clampValue(position.y, top, bottom),
    };
};

export const getRelativePosition = (windowRect, containerRect) => {
    if (!windowRect || !containerRect) {
        return { x: 0, y: 0 };
    }
    return {
        x: windowRect.left - containerRect.left,
        y: windowRect.top - containerRect.top,
    };
};
