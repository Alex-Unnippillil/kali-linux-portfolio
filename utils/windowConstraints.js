const BASE_CONSTRAINTS = {
  default: { type: 'default', minWidthPx: 320, minHeightPx: 240 },
  form: { type: 'form', minWidthPx: 384, minHeightPx: 360 },
  list: { type: 'list', minWidthPx: 440, minHeightPx: 320 },
  media: { type: 'media', minWidthPx: 512, minHeightPx: 320 },
};

const MEDIA_SELECTOR =
  'video, audio, canvas, iframe, model-viewer, [data-media], .media-player, .video-player, .game-canvas';

const LIST_SELECTOR =
  'table, thead, tbody, tr, ul, ol, dl, [role="list"], [role="tree"], [role="grid"], [role="table"], [data-view="list"], [data-view="grid"], .data-grid, .data-table, .list-container';

const isFiniteNumber = (value) => Number.isFinite(value);

const parseDimension = (value) => {
  if (value === undefined || value === null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getConstraintPreset = (type = 'default') => {
  const preset = BASE_CONSTRAINTS[type] || BASE_CONSTRAINTS.default;
  return { ...preset };
};

const getExplicitType = (node) => {
  if (!node) return null;
  const datasetType = node.dataset?.windowContent;
  if (datasetType && BASE_CONSTRAINTS[datasetType]) {
    return datasetType;
  }
  const explicitChild = node.querySelector('[data-window-content]');
  if (explicitChild) {
    const childType = explicitChild.getAttribute('data-window-content');
    if (childType && BASE_CONSTRAINTS[childType]) {
      return childType;
    }
  }
  return null;
};

export const detectContentType = (node) => {
  if (!node) return 'default';

  const explicit = getExplicitType(node);
  if (explicit) {
    return explicit;
  }

  if (node.querySelector(MEDIA_SELECTOR)) {
    return 'media';
  }

  if (node.querySelector('form')) {
    return 'form';
  }

  if (node.querySelector(LIST_SELECTOR)) {
    return 'list';
  }

  return 'default';
};

export const resolveConstraints = (node) => {
  const type = detectContentType(node);
  const base = getConstraintPreset(type);
  const minWidthPx = parseDimension(node?.dataset?.windowMinWidth) ?? base.minWidthPx;
  const minHeightPx = parseDimension(node?.dataset?.windowMinHeight) ?? base.minHeightPx;
  return {
    type: base.type,
    minWidthPx,
    minHeightPx,
  };
};

export const clampPercentFromPx = (px, viewportSize) => {
  if (!px || !viewportSize || !isFiniteNumber(px) || !isFiniteNumber(viewportSize)) {
    return 0;
  }
  if (viewportSize <= 0) return 0;
  const ratio = (px / viewportSize) * 100;
  return Math.min(Math.max(ratio, 0), 100);
};

export const enforceSizeConstraints = (widthPercent, heightPercent, viewportWidth, viewportHeight, constraints) => {
  if (!constraints) {
    return {
      widthPercent,
      heightPercent,
    };
  }

  const minWidthPercent = clampPercentFromPx(constraints.minWidthPx, viewportWidth);
  const minHeightPercent = clampPercentFromPx(constraints.minHeightPx, viewportHeight);

  return {
    widthPercent: Math.max(widthPercent, minWidthPercent || 0),
    heightPercent: Math.max(heightPercent, minHeightPercent || 0),
  };
};

export const getMinDimensions = (constraints) => ({
  minWidthPx: constraints?.minWidthPx || 0,
  minHeightPx: constraints?.minHeightPx || 0,
});

export default {
  detectContentType,
  resolveConstraints,
  clampPercentFromPx,
  enforceSizeConstraints,
  getConstraintPreset,
  getMinDimensions,
};
