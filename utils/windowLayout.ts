export type LayoutDirection = 'horizontal' | 'vertical';

export type LayoutMargins = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export interface LayoutOptions {
  margin?: number | LayoutMargins;
  gap?: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const sanitize = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const resolveMargins = (margin?: number | LayoutMargins): Required<LayoutMargins> => {
  if (typeof margin === 'number') {
    const sanitized = sanitize(margin);
    return { top: sanitized, right: sanitized, bottom: sanitized, left: sanitized };
  }
  return {
    top: sanitize(margin?.top),
    right: sanitize(margin?.right),
    bottom: sanitize(margin?.bottom),
    left: sanitize(margin?.left),
  };
};

export const computeWindowLayout = (
  ids: string[],
  direction: LayoutDirection,
  options: LayoutOptions = {}
): Record<string, NormalizedRect> => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return {};
  }
  if (direction !== 'horizontal' && direction !== 'vertical') {
    throw new Error(`Unsupported layout direction: ${direction}`);
  }

  const margins = resolveMargins(options.margin);
  const gap = sanitize(options.gap);
  const count = ids.length;
  const result: Record<string, NormalizedRect> = {};

  if (direction === 'horizontal') {
    const availableWidth = Math.max(0, 1 - margins.left - margins.right - gap * (count - 1));
    const width = count > 0 ? availableWidth / count : 0;
    const height = Math.max(0, 1 - margins.top - margins.bottom);
    const maxXStart = Math.max(0, 1 - width);

    ids.forEach((id, index) => {
      const xStart = margins.left + index * (width + gap);
      result[id] = {
        x: clamp(xStart, 0, maxXStart),
        y: clamp(margins.top, 0, Math.max(0, 1 - height)),
        width: clamp(width, 0, Math.max(0, 1 - margins.left - margins.right)),
        height,
      };
    });
  } else {
    const availableHeight = Math.max(0, 1 - margins.top - margins.bottom - gap * (count - 1));
    const height = count > 0 ? availableHeight / count : 0;
    const width = Math.max(0, 1 - margins.left - margins.right);
    const maxYStart = Math.max(0, 1 - height);

    ids.forEach((id, index) => {
      const yStart = margins.top + index * (height + gap);
      result[id] = {
        x: clamp(margins.left, 0, Math.max(0, 1 - width)),
        y: clamp(yStart, 0, maxYStart),
        width,
        height: clamp(height, 0, Math.max(0, 1 - margins.top - margins.bottom)),
      };
    });
  }

  return result;
};
