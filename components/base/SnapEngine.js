const SnapPos = Object.freeze({
    NONE: 'none',
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
});

const DEFAULT_THRESHOLDS = Object.freeze({
    edge: 24,
    corner: 32,
});

const toFiniteOrNull = (value) => (Number.isFinite(value) ? value : null);

const normalizeThresholds = (thresholds = DEFAULT_THRESHOLDS) => {
    const edge = toFiniteOrNull(thresholds?.edge);
    const corner = toFiniteOrNull(thresholds?.corner);

    return {
        edge: edge !== null ? Math.max(edge, 0) : DEFAULT_THRESHOLDS.edge,
        corner: corner !== null ? Math.max(corner, 0) : DEFAULT_THRESHOLDS.corner,
    };
};

const normalizeViewport = (viewport = {}) => ({
    width: Math.max(0, toFiniteOrNull(viewport.width) ?? 0),
    height: Math.max(0, toFiniteOrNull(viewport.height) ?? 0),
});

const normalizePointer = (pointer = {}) => ({
    x: toFiniteOrNull(pointer.x) ?? 0,
    y: toFiniteOrNull(pointer.y) ?? 0,
});

const normalizeBounds = (bounds = {}) => ({
    left: toFiniteOrNull(bounds.left),
    top: toFiniteOrNull(bounds.top),
    width: toFiniteOrNull(bounds.width),
    height: toFiniteOrNull(bounds.height),
});

const computeEdgeDistances = (viewport, pointer, bounds) => {
    const { width: viewportWidth, height: viewportHeight } = normalizeViewport(viewport);
    const { x: pointerX, y: pointerY } = normalizePointer(pointer);
    const { left, top, width, height } = normalizeBounds(bounds);

    const windowRight = left !== null && width !== null ? left + width : null;
    const windowBottom = top !== null && height !== null ? top + height : null;

    const leftDistance = Math.min(
        pointerX,
        left !== null ? Math.max(left, 0) : Number.POSITIVE_INFINITY,
    );

    const rightDistance = Math.min(
        Math.max(viewportWidth - pointerX, 0),
        windowRight !== null ? Math.max(viewportWidth - windowRight, 0) : Number.POSITIVE_INFINITY,
    );

    const topDistance = Math.min(
        pointerY,
        top !== null ? Math.max(top, 0) : Number.POSITIVE_INFINITY,
    );

    const bottomDistance = Math.min(
        Math.max(viewportHeight - pointerY, 0),
        windowBottom !== null ? Math.max(viewportHeight - windowBottom, 0) : Number.POSITIVE_INFINITY,
    );

    return { left: leftDistance, right: rightDistance, top: topDistance, bottom: bottomDistance };
};

const pickCornerSnap = (distances, thresholds) => {
    const { corner } = thresholds;
    const { left, right, top, bottom } = distances;

    if (left <= corner && top <= corner) return SnapPos.TOP_LEFT;
    if (right <= corner && top <= corner) return SnapPos.TOP_RIGHT;
    if (left <= corner && bottom <= corner) return SnapPos.BOTTOM_LEFT;
    if (right <= corner && bottom <= corner) return SnapPos.BOTTOM_RIGHT;

    return SnapPos.NONE;
};

const pickEdgeSnap = (distances, thresholds) => {
    const { edge } = thresholds;
    const { left, right, top } = distances;

    if (left <= edge) return SnapPos.LEFT;
    if (right <= edge) return SnapPos.RIGHT;
    if (top <= edge) return SnapPos.TOP;

    return SnapPos.NONE;
};

export const detectCornerSnap = (viewport, pointer, bounds, thresholds = DEFAULT_THRESHOLDS) => {
    const normalizedThresholds = normalizeThresholds(thresholds);
    const distances = computeEdgeDistances(viewport, pointer, bounds);
    return pickCornerSnap(distances, normalizedThresholds);
};

export const detectEdgeSnap = (viewport, pointer, bounds, thresholds = DEFAULT_THRESHOLDS) => {
    const normalizedThresholds = normalizeThresholds(thresholds);
    const distances = computeEdgeDistances(viewport, pointer, bounds);
    return pickEdgeSnap(distances, normalizedThresholds);
};

export const detectSnapPosition = ({
    viewport,
    pointer,
    bounds,
    thresholds = DEFAULT_THRESHOLDS,
    modifiers = {},
} = {}) => {
    if (modifiers.altKey) {
        return SnapPos.NONE;
    }

    const normalizedThresholds = normalizeThresholds(thresholds);
    const distances = computeEdgeDistances(viewport, pointer, bounds);

    const cornerSnap = pickCornerSnap(distances, normalizedThresholds);
    if (cornerSnap !== SnapPos.NONE) {
        return cornerSnap;
    }

    return pickEdgeSnap(distances, normalizedThresholds);
};

export const isSnapPosition = (position) => position && position !== SnapPos.NONE;

export { SnapPos, DEFAULT_THRESHOLDS };

export default {
    SnapPos,
    DEFAULT_THRESHOLDS,
    detectCornerSnap,
    detectEdgeSnap,
    detectSnapPosition,
    isSnapPosition,
};
