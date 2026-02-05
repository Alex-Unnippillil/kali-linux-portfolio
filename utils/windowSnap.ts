import { WINDOW_TOP_INSET, WINDOW_TOP_MARGIN } from "./uiConstants";

export type SnapPosition =
  | "left"
  | "right"
  | "top"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type SnapRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SnapCandidate = {
  position: SnapPosition;
  previewRect: SnapRect;
};

export type SnapViewport = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export type SnapInsets = {
  topInset: number;
  snapBottomInset: number;
  safeAreaBottom: number;
};

export type SnapThresholds = {
  x: number;
  y: number;
};

const normalizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return value;
};

const normalizeTopInset = (value: number) => {
  const fallback = WINDOW_TOP_INSET + WINDOW_TOP_MARGIN;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(value, fallback);
};

export const computeSnapRegions = (
  viewport: SnapViewport,
  insets: SnapInsets,
): Record<SnapPosition, SnapRect> => {
  const viewportWidth = normalizeNumber(viewport.width);
  const viewportHeight = normalizeNumber(viewport.height);
  const viewportLeft = normalizeNumber(viewport.left);
  const viewportTop = normalizeNumber(viewport.top);
  const topInset = normalizeTopInset(insets.topInset);
  const snapBottomInset = Math.max(normalizeNumber(insets.snapBottomInset), 0);
  const safeAreaBottom = Math.max(normalizeNumber(insets.safeAreaBottom), 0);
  const availableHeight = Math.max(
    0,
    viewportHeight - topInset - snapBottomInset - safeAreaBottom,
  );
  const halfWidth = Math.max(viewportWidth / 2, 0);
  const halfHeight = Math.max(availableHeight / 2, 0);
  const leftEdge = viewportLeft;
  const topEdge = viewportTop + topInset;
  const rightStart = viewportLeft + Math.max(viewportWidth - halfWidth, 0);
  const bottomStart = topEdge + halfHeight;

  return {
    left: { left: leftEdge, top: topEdge, width: halfWidth, height: availableHeight },
    right: { left: rightStart, top: topEdge, width: halfWidth, height: availableHeight },
    top: { left: leftEdge, top: topEdge, width: viewportWidth, height: availableHeight },
    "top-left": { left: leftEdge, top: topEdge, width: halfWidth, height: halfHeight },
    "top-right": { left: rightStart, top: topEdge, width: halfWidth, height: halfHeight },
    "bottom-left": { left: leftEdge, top: bottomStart, width: halfWidth, height: halfHeight },
    "bottom-right": { left: rightStart, top: bottomStart, width: halfWidth, height: halfHeight },
  };
};

const isPointerInZone = (
  position: SnapPosition,
  pointer: { x: number; y: number },
  viewport: SnapViewport,
  insets: SnapInsets,
  thresholds: SnapThresholds,
) => {
  const leftEdge = viewport.left;
  const rightEdge = viewport.left + viewport.width;
  const topEdge = viewport.top + normalizeTopInset(insets.topInset);
  const bottomEdge =
    viewport.top +
    viewport.height -
    Math.max(insets.snapBottomInset, 0) -
    Math.max(insets.safeAreaBottom, 0);

  const nearTop = pointer.y <= topEdge + thresholds.y;
  const nearBottom = pointer.y >= bottomEdge - thresholds.y;
  const nearLeft = pointer.x <= leftEdge + thresholds.x;
  const nearRight = pointer.x >= rightEdge - thresholds.x;

  if (position === "top-left") return nearTop && nearLeft;
  if (position === "top-right") return nearTop && nearRight;
  if (position === "bottom-left") return nearBottom && nearLeft;
  if (position === "bottom-right") return nearBottom && nearRight;
  if (position === "top") return nearTop;
  if (position === "left") return nearLeft;
  if (position === "right") return nearRight;
  return false;
};

const resolveCandidateFromEdges = (
  pointer: { x: number; y: number },
  viewport: SnapViewport,
  insets: SnapInsets,
  thresholds: SnapThresholds,
  regions: Record<SnapPosition, SnapRect>,
): SnapCandidate | null => {
  const leftEdge = viewport.left;
  const rightEdge = viewport.left + viewport.width;
  const topEdge = viewport.top + normalizeTopInset(insets.topInset);
  const bottomEdge =
    viewport.top +
    viewport.height -
    Math.max(insets.snapBottomInset, 0) -
    Math.max(insets.safeAreaBottom, 0);

  const nearTop = pointer.y <= topEdge + thresholds.y;
  const nearBottom = pointer.y >= bottomEdge - thresholds.y;
  const nearLeft = pointer.x <= leftEdge + thresholds.x;
  const nearRight = pointer.x >= rightEdge - thresholds.x;

  if (nearTop && nearLeft && regions["top-left"].width > 0 && regions["top-left"].height > 0) {
    return { position: "top-left", previewRect: regions["top-left"] };
  }
  if (nearTop && nearRight && regions["top-right"].width > 0 && regions["top-right"].height > 0) {
    return { position: "top-right", previewRect: regions["top-right"] };
  }
  if (
    nearBottom &&
    nearLeft &&
    regions["bottom-left"].width > 0 &&
    regions["bottom-left"].height > 0
  ) {
    return { position: "bottom-left", previewRect: regions["bottom-left"] };
  }
  if (
    nearBottom &&
    nearRight &&
    regions["bottom-right"].width > 0 &&
    regions["bottom-right"].height > 0
  ) {
    return { position: "bottom-right", previewRect: regions["bottom-right"] };
  }
  if (nearTop && regions.top.height > 0) {
    return { position: "top", previewRect: regions.top };
  }
  if (nearLeft && regions.left.width > 0) {
    return { position: "left", previewRect: regions.left };
  }
  if (nearRight && regions.right.width > 0) {
    return { position: "right", previewRect: regions.right };
  }

  return null;
};

export const resolvePointerSnapCandidate = ({
  viewport,
  insets,
  pointer,
  thresholds,
  previousCandidate = null,
  hysteresisPadding = 0,
}: {
  viewport: SnapViewport;
  insets: SnapInsets;
  pointer: { x: number; y: number };
  thresholds: SnapThresholds;
  previousCandidate?: SnapCandidate | null;
  hysteresisPadding?: number;
}): SnapCandidate | null => {
  const regions = computeSnapRegions(viewport, insets);
  const nextCandidate = resolveCandidateFromEdges(pointer, viewport, insets, thresholds, regions);
  if (nextCandidate) {
    return nextCandidate;
  }

  if (!previousCandidate) {
    return null;
  }

  const exitThresholds = {
    x: thresholds.x + hysteresisPadding,
    y: thresholds.y + hysteresisPadding,
  };
  const stillInZone = isPointerInZone(
    previousCandidate.position,
    pointer,
    viewport,
    insets,
    exitThresholds,
  );
  if (!stillInZone) {
    return null;
  }

  const previewRect = regions[previousCandidate.position];
  if (!previewRect) return null;
  return { position: previousCandidate.position, previewRect };
};
