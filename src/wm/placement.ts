export interface WorkspaceMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowBounds extends Rect {
  id: string;
}

export type Edge = 'left' | 'right' | 'top' | 'bottom';
export type Axis = 'horizontal' | 'vertical';
export type SnapKind = 'align' | 'flush';

export interface SnapAnimation {
  type: 'snap';
  durationMs: number;
}

export interface SnapAlignment {
  targetId: string;
  axis: Axis;
  sourceEdge: Edge;
  targetEdge: Edge;
  distance: number;
  kind: SnapKind;
  offset: number;
  rect: Rect;
}

export interface DragPlacementInput {
  rect: Rect;
  siblings: WindowBounds[];
  tolerance?: number;
  prevSnap?: SnapAlignment | null;
  selfId?: string;
}

export interface DragPlacementResult {
  rect: Rect;
  snap: SnapAlignment | null;
  animation: SnapAnimation | null;
}

const EPSILON = 1e-3;
export const SNAP_EDGE_TOLERANCE = 8;
export const SNAP_ANIMATION_DURATION_MS = 140;

export function getMaximizedRect(
  margins: WorkspaceMargins,
  viewport?: { width: number; height: number }
): Rect {
  const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const viewportWidth = viewport?.width ?? fallbackWidth;
  const viewportHeight = viewport?.height ?? fallbackHeight;

  const width = Math.max(0, viewportWidth - margins.left - margins.right);
  const height = Math.max(0, viewportHeight - margins.top - margins.bottom);

  return {
    x: margins.left,
    y: margins.top,
    width,
    height,
  };
}

export function computeDragPlacement({
  rect,
  siblings,
  tolerance = SNAP_EDGE_TOLERANCE,
  prevSnap = null,
  selfId,
}: DragPlacementInput): DragPlacementResult {
  if (!isValidRect(rect) || rect.width <= 0 || rect.height <= 0) {
    return { rect, snap: null, animation: null };
  }

  const sanitizedTolerance = Math.max(0, tolerance);
  const candidate = detectSiblingEdgeSnap(rect, siblings, sanitizedTolerance, selfId);

  if (!candidate) {
    return { rect, snap: null, animation: null };
  }

  const { overlap: _overlap, magnitude: _magnitude, ...snap } = candidate;
  const shouldAnimate =
    !prevSnap ||
    prevSnap.targetId !== snap.targetId ||
    prevSnap.sourceEdge !== snap.sourceEdge ||
    prevSnap.targetEdge !== snap.targetEdge ||
    prevSnap.kind !== snap.kind;

  return {
    rect: snap.rect,
    snap,
    animation: shouldAnimate
      ? { type: 'snap', durationMs: SNAP_ANIMATION_DURATION_MS }
      : null,
  };
}

interface SnapCandidate extends SnapAlignment {
  overlap: number;
  magnitude: number;
}

function detectSiblingEdgeSnap(
  rect: Rect,
  siblings: WindowBounds[],
  tolerance: number,
  selfId?: string
): SnapCandidate | null {
  const candidates: SnapCandidate[] = [];

  for (const sibling of siblings) {
    if (selfId && sibling.id === selfId) continue;
    if (!isValidRect(sibling) || sibling.width <= 0 || sibling.height <= 0) {
      continue;
    }

    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;

    const siblingLeft = sibling.x;
    const siblingRight = sibling.x + sibling.width;
    const siblingTop = sibling.y;
    const siblingBottom = sibling.y + sibling.height;

    const verticalOverlap = Math.min(rectBottom, siblingBottom) - Math.max(rectTop, siblingTop);
    const horizontalOverlap =
      Math.min(rectRight, siblingRight) - Math.max(rectLeft, siblingLeft);

    if (verticalOverlap + tolerance > 0) {
      const overlap = Math.max(0, verticalOverlap);
      pushHorizontalCandidate({
        rect,
        sibling,
        candidates,
        tolerance,
        overlap,
        rectLeft,
        rectRight,
        siblingLeft,
        siblingRight,
      });
    }

    if (horizontalOverlap + tolerance > 0) {
      const overlap = Math.max(0, horizontalOverlap);
      pushVerticalCandidate({
        rect,
        sibling,
        candidates,
        tolerance,
        overlap,
        rectTop,
        rectBottom,
        siblingTop,
        siblingBottom,
      });
    }
  }

  return selectBestCandidate(candidates);
}

function pushHorizontalCandidate({
  rect,
  sibling,
  candidates,
  tolerance,
  overlap,
  rectLeft,
  rectRight,
  siblingLeft,
  siblingRight,
}: {
  rect: Rect;
  sibling: WindowBounds;
  candidates: SnapCandidate[];
  tolerance: number;
  overlap: number;
  rectLeft: number;
  rectRight: number;
  siblingLeft: number;
  siblingRight: number;
}): void {
  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'horizontal',
    sourceEdge: 'left',
    targetEdge: 'right',
    newRect: { ...rect, x: siblingRight },
    diff: rectLeft - siblingRight,
    overlap,
    kind: 'flush',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'horizontal',
    sourceEdge: 'right',
    targetEdge: 'left',
    newRect: { ...rect, x: siblingLeft - rect.width },
    diff: rectRight - siblingLeft,
    overlap,
    kind: 'flush',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'horizontal',
    sourceEdge: 'left',
    targetEdge: 'left',
    newRect: { ...rect, x: siblingLeft },
    diff: rectLeft - siblingLeft,
    overlap,
    kind: 'align',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'horizontal',
    sourceEdge: 'right',
    targetEdge: 'right',
    newRect: { ...rect, x: siblingRight - rect.width },
    diff: rectRight - siblingRight,
    overlap,
    kind: 'align',
    tolerance,
  });
}

function pushVerticalCandidate({
  rect,
  sibling,
  candidates,
  tolerance,
  overlap,
  rectTop,
  rectBottom,
  siblingTop,
  siblingBottom,
}: {
  rect: Rect;
  sibling: WindowBounds;
  candidates: SnapCandidate[];
  tolerance: number;
  overlap: number;
  rectTop: number;
  rectBottom: number;
  siblingTop: number;
  siblingBottom: number;
}): void {
  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'vertical',
    sourceEdge: 'top',
    targetEdge: 'bottom',
    newRect: { ...rect, y: siblingBottom },
    diff: rectTop - siblingBottom,
    overlap,
    kind: 'flush',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'vertical',
    sourceEdge: 'bottom',
    targetEdge: 'top',
    newRect: { ...rect, y: siblingTop - rect.height },
    diff: rectBottom - siblingTop,
    overlap,
    kind: 'flush',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'vertical',
    sourceEdge: 'top',
    targetEdge: 'top',
    newRect: { ...rect, y: siblingTop },
    diff: rectTop - siblingTop,
    overlap,
    kind: 'align',
    tolerance,
  });

  addCandidate({
    candidates,
    rect,
    sibling,
    axis: 'vertical',
    sourceEdge: 'bottom',
    targetEdge: 'bottom',
    newRect: { ...rect, y: siblingBottom - rect.height },
    diff: rectBottom - siblingBottom,
    overlap,
    kind: 'align',
    tolerance,
  });
}

function addCandidate({
  candidates,
  rect,
  sibling,
  axis,
  sourceEdge,
  targetEdge,
  newRect,
  diff,
  overlap,
  kind,
  tolerance,
}: {
  candidates: SnapCandidate[];
  rect: Rect;
  sibling: WindowBounds;
  axis: Axis;
  sourceEdge: Edge;
  targetEdge: Edge;
  newRect: Rect;
  diff: number;
  overlap: number;
  kind: SnapKind;
  tolerance: number;
}): void {
  const distance = Math.abs(diff);
  if (distance > tolerance) return;

  const offset = axis === 'horizontal' ? newRect.x - rect.x : newRect.y - rect.y;
  if (!Number.isFinite(offset)) return;

  candidates.push({
    targetId: sibling.id,
    axis,
    sourceEdge,
    targetEdge,
    distance,
    kind,
    offset,
    rect: newRect,
    overlap,
    magnitude: Math.abs(offset),
  });
}

function selectBestCandidate(candidates: SnapCandidate[]): SnapCandidate | null {
  return candidates.reduce<SnapCandidate | null>((best, candidate) => {
    const candidateIsStatic = candidate.magnitude <= EPSILON;
    const bestIsStatic = best ? best.magnitude <= EPSILON : false;

    if (!best) {
      return candidate;
    }

    if (candidateIsStatic && !bestIsStatic) {
      return best;
    }

    if (!candidateIsStatic && bestIsStatic) {
      return candidate;
    }

    if (candidate.distance < best.distance - EPSILON) {
      return candidate;
    }

    if (Math.abs(candidate.distance - best.distance) <= EPSILON) {
      if (candidate.kind !== best.kind) {
        return candidate.kind === 'flush' ? candidate : best;
      }

      if (candidate.overlap > best.overlap + EPSILON) {
        return candidate;
      }

      if (Math.abs(candidate.overlap - best.overlap) <= EPSILON) {
        if (candidate.magnitude > best.magnitude + EPSILON) {
          return candidate;
        }
        if (best.magnitude > candidate.magnitude + EPSILON) {
          return best;
        }
        if (candidate.axis === 'horizontal' && best.axis === 'vertical') {
          return candidate;
        }
        if (candidate.axis === 'vertical' && best.axis === 'horizontal') {
          return best;
        }
        if (candidate.targetId < best.targetId) {
          return candidate;
        }
      }
    }

    return best;
  }, null);
}

function isValidRect(rect: Rect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  );
}
