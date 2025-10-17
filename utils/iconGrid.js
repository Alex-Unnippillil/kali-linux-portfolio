const clampNumber = (value, fallback = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return number;
};

const sanitizePadding = (padding = {}) => ({
    top: Math.max(0, clampNumber(padding.top)),
    right: Math.max(0, clampNumber(padding.right)),
    bottom: Math.max(0, clampNumber(padding.bottom)),
    left: Math.max(0, clampNumber(padding.left)),
});

const sanitizeDimensions = (dimensions = {}) => ({
    width: Math.max(0, clampNumber(dimensions.width)),
    height: Math.max(0, clampNumber(dimensions.height)),
});

const sanitizeSpacing = (spacing = {}) => ({
    column: Math.max(1, clampNumber(spacing.column, 1)),
    row: Math.max(1, clampNumber(spacing.row, 1)),
});

const snapAxis = (value, origin, spacing) => {
    if (!Number.isFinite(value)) return value;
    if (!Number.isFinite(origin)) return value;
    if (!Number.isFinite(spacing) || spacing <= 0) return value;
    const relative = value - origin;
    const snappedRelative = Math.round(relative / spacing) * spacing;
    return origin + snappedRelative;
};

export const computeIconGridMetrics = ({ bounds = {}, iconDimensions = {}, gridSpacing = {}, padding = {} } = {}) => {
    const sanitizedPadding = sanitizePadding(padding);
    const sanitizedDimensions = sanitizeDimensions(iconDimensions);
    const sanitizedSpacing = sanitizeSpacing(gridSpacing);
    const width = Math.max(0, clampNumber(bounds.width, 0));
    const height = Math.max(0, clampNumber(bounds.height, 0));
    const usableHeight = Math.max(
        sanitizedDimensions.height,
        height - (sanitizedPadding.top + sanitizedPadding.bottom),
    );
    const iconsPerColumn = Math.max(1, Math.floor(usableHeight / sanitizedSpacing.row));
    const originX = sanitizedPadding.left;
    const originY = sanitizedPadding.top;
    const iconHalfWidth = sanitizedDimensions.width / 2;
    const iconHalfHeight = sanitizedDimensions.height / 2;

    return {
        width,
        height,
        padding: sanitizedPadding,
        iconDimensions: sanitizedDimensions,
        spacing: sanitizedSpacing,
        iconsPerColumn,
        originX,
        originY,
        centerOriginX: originX + iconHalfWidth,
        centerOriginY: originY + iconHalfHeight,
        iconHalfWidth,
        iconHalfHeight,
    };
};

export const snapPositionToGrid = ({ x, y }, metrics) => {
    if (!metrics) return { x, y };
    const snappedX = snapAxis(clampNumber(x, 0), metrics.originX, metrics.spacing.column);
    const snappedY = snapAxis(clampNumber(y, 0), metrics.originY, metrics.spacing.row);
    return { x: snappedX, y: snappedY };
};

export const snapCenterToGrid = ({ x, y }, metrics) => {
    if (!metrics) return { x, y };
    const snappedX = snapAxis(clampNumber(x, 0), metrics.centerOriginX, metrics.spacing.column);
    const snappedY = snapAxis(clampNumber(y, 0), metrics.centerOriginY, metrics.spacing.row);
    return { x: snappedX, y: snappedY };
};

export const getCellFromPosition = ({ x, y } = {}, metrics) => {
    if (!metrics) {
        return { column: 0, row: 0 };
    }
    const column = Math.round((clampNumber(x, metrics.originX) - metrics.originX) / metrics.spacing.column);
    const row = Math.round((clampNumber(y, metrics.originY) - metrics.originY) / metrics.spacing.row);
    return {
        column: Number.isFinite(column) ? Math.max(0, column) : 0,
        row: Number.isFinite(row) ? Math.max(0, row) : 0,
    };
};

export const getPositionFromCell = ({ column, row } = {}, metrics) => {
    if (!metrics) {
        return { x: 0, y: 0 };
    }
    const safeColumn = Math.max(0, clampNumber(column, 0));
    const safeRow = Math.max(0, clampNumber(row, 0));
    return {
        x: metrics.originX + safeColumn * metrics.spacing.column,
        y: metrics.originY + safeRow * metrics.spacing.row,
    };
};
