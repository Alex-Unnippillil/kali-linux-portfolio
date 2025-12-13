import { DEFAULT_WINDOW_TOP_OFFSET, measureSafeAreaInset, measureSnapBottomInset, WINDOW_TOP_INSET, WINDOW_TOP_MARGIN } from '../../utils/windowLayout';
import { clamp, percentOf } from './windowResize';
import { SnapPosition } from './windowTypes';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;

export const SNAP_LABELS: Record<string, string> = {
    left: 'Snap left half',
    right: 'Snap right half',
    top: 'Snap full screen',
    'top-left': 'Snap top-left quarter',
    'top-right': 'Snap top-right quarter',
    'bottom-left': 'Snap bottom-left quarter',
    'bottom-right': 'Snap bottom-right quarter',
};

export const getSnapLabel = (position?: SnapPosition | null) => {
    if (!position) return 'Snap window';
    return SNAP_LABELS[position] || 'Snap window';
};

export const computeEdgeThreshold = (size: number) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

export const computeSnapRegions = (
    viewportWidth: number,
    viewportHeight: number,
    viewportLeft = 0,
    viewportTop = 0,
    topInset = DEFAULT_WINDOW_TOP_OFFSET,
    bottomInset?: number,
    safeBottomOverride?: number,
) => {
    const normalizedTopInset = typeof topInset === 'number' && Number.isFinite(topInset)
        ? Math.max(topInset, WINDOW_TOP_INSET + WINDOW_TOP_MARGIN)
        : DEFAULT_WINDOW_TOP_OFFSET;
    const safeBottom = typeof safeBottomOverride === 'number' && Number.isFinite(safeBottomOverride)
        ? Math.max(safeBottomOverride, 0)
        : Math.max(0, measureSafeAreaInset('bottom'));
    const snapBottomInset = typeof bottomInset === 'number' && Number.isFinite(bottomInset)
        ? Math.max(bottomInset, 0)
        : measureSnapBottomInset();
    const availableHeight = Math.max(viewportHeight - normalizedTopInset - snapBottomInset - safeBottom, 0);
    const halfWidth = Math.max(viewportWidth / 2, 0);
    const halfHeight = Math.max(availableHeight / 2, 0);
    const leftEdge = viewportLeft;
    const topEdge = viewportTop + normalizedTopInset;
    const rightStart = viewportLeft + Math.max(viewportWidth - halfWidth, 0);
    const bottomStart = topEdge + halfHeight;

    return {
        left: { left: leftEdge, top: topEdge, width: halfWidth, height: availableHeight },
        right: { left: rightStart, top: topEdge, width: halfWidth, height: availableHeight },
        top: { left: leftEdge, top: topEdge, width: viewportWidth, height: availableHeight },
        'top-left': { left: leftEdge, top: topEdge, width: halfWidth, height: halfHeight },
        'top-right': { left: rightStart, top: topEdge, width: halfWidth, height: halfHeight },
        'bottom-left': { left: leftEdge, top: bottomStart, width: halfWidth, height: halfHeight },
        'bottom-right': { left: rightStart, top: bottomStart, width: halfWidth, height: halfHeight },
    } as Record<SnapPosition, { left: number; top: number; width: number; height: number }>;
};

export const normalizeRightCornerSnap = (candidate: { position: SnapPosition | null; preview: any } | null, regions: Record<string, any> | null) => {
    if (!candidate) return null;
    const { position } = candidate;
    if (position === 'top-right' || position === 'bottom-right') {
        const rightRegion = regions?.right;
        if (rightRegion && rightRegion.width > 0 && rightRegion.height > 0) {
            return { position: 'right' as SnapPosition, preview: rightRegion };
        }
    }
    return candidate;
};

export { percentOf };
