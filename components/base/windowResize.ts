import { DEFAULT_WINDOW_TOP_OFFSET, measureWindowTopOffset, measureSafeAreaInset, measureSnapBottomInset } from '../../utils/windowLayout';
import { ViewportMetrics } from './windowTypes';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const parsePxValue = (value: string | null | undefined) => {
    if (typeof value !== 'string') return null;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export const normalizePercentageDimension = (value: number | undefined, fallback: number) => {
    if (typeof value !== 'number') return fallback;
    if (!Number.isFinite(value)) return fallback;
    if (value <= 0) return fallback;
    return value;
};

export const percentOf = (value: number, total: number) => {
    if (!total) return 0;
    return (value / total) * 100;
};

export const getViewportMetrics = (): ViewportMetrics => {
    if (typeof window === 'undefined') {
        return { width: 0, height: 0, left: 0, top: 0 };
    }

    const fallbackWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
    const fallbackHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
    const visualViewport = window.visualViewport;

    if (visualViewport) {
        const width = Number.isFinite(visualViewport.width) ? visualViewport.width : fallbackWidth;
        const height = Number.isFinite(visualViewport.height) ? visualViewport.height : fallbackHeight;
        const left = Number.isFinite(visualViewport.offsetLeft) ? visualViewport.offsetLeft : 0;
        const top = Number.isFinite(visualViewport.offsetTop) ? visualViewport.offsetTop : 0;
        return {
            width: width || fallbackWidth,
            height: height || fallbackHeight,
            left,
            top,
        };
    }

    return { width: fallbackWidth, height: fallbackHeight, left: 0, top: 0 };
};

export const getDragBoundaries = (widthPercent: number, heightPercent: number) => {
    const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
    const topInset = typeof window !== 'undefined'
        ? measureWindowTopOffset()
        : DEFAULT_WINDOW_TOP_OFFSET;
    const windowHeightPx = viewportHeight * (heightPercent / 100.0);
    const windowWidthPx = viewportWidth * (widthPercent / 100.0);
    const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const snapBottomInset = measureSnapBottomInset();
    const availableVertical = Math.max(viewportHeight - topInset - snapBottomInset - safeAreaBottom, 0);
    const availableHorizontal = Math.max(viewportWidth - windowWidthPx, 0);
    const maxTop = Math.max(availableVertical - windowHeightPx, 0);

    return {
        viewport: { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop },
        safeAreaBottom,
        snapBottomInset,
        topInset,
        parentSize: {
            height: maxTop,
            width: availableHorizontal,
        },
    };
};
