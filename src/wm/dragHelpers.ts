import type { DraggableData, DraggableEvent } from 'react-draggable';

export interface DragBounds {
  width: number;
  height: number;
}

export interface EdgeResistanceOptions {
  /**
   * Number of pixels from the edge that should apply resistance.
   */
  distance?: number;
  /**
   * Multiplier applied to the drag delta when resistance is active.
   * Smaller values increase the slowdown effect.
   */
  strength?: number;
}

export const EDGE_RESISTANCE_DISTANCE = 12;
export const EDGE_RESISTANCE_STRENGTH = 0.35;

interface ShiftKeyEventLike {
  shiftKey?: boolean;
  nativeEvent?: {
    shiftKey?: boolean;
  };
}

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const isShiftKeyPressed = (event?: DraggableEvent): boolean => {
  if (!event) return false;
  const candidate = event as ShiftKeyEventLike;
  if (typeof candidate.shiftKey === 'boolean') {
    return candidate.shiftKey;
  }
  if (candidate.nativeEvent && typeof candidate.nativeEvent.shiftKey === 'boolean') {
    return candidate.nativeEvent.shiftKey;
  }
  return false;
};

const applyAxisResistance = (
  value: number,
  min: number,
  max: number,
  distance: number,
  strength: number
) => {
  const clamped = clamp(value, min, max);
  if (distance <= 0) {
    return clamped;
  }

  const lowerEdge = min + distance;
  const upperEdge = max - distance;

  if (clamped <= lowerEdge) {
    const delta = clamped - min;
    return min + delta * strength;
  }

  if (clamped >= upperEdge) {
    const delta = max - clamped;
    return max - delta * strength;
  }

  return clamped;
};

export const getResistedPosition = (
  data: Pick<DraggableData, 'x' | 'y'>,
  bounds: DragBounds,
  event?: DraggableEvent,
  options: EdgeResistanceOptions = {}
): { x: number; y: number } => {
  const { distance = EDGE_RESISTANCE_DISTANCE, strength = EDGE_RESISTANCE_STRENGTH } = options;
  const maxX = bounds.width;
  const maxY = bounds.height;

  if (isShiftKeyPressed(event)) {
    return {
      x: clamp(data.x, 0, maxX),
      y: clamp(data.y, 0, maxY),
    };
  }

  return {
    x: applyAxisResistance(data.x, 0, maxX, distance, strength),
    y: applyAxisResistance(data.y, 0, maxY, distance, strength),
  };
};

export const applyEdgeResistanceToNode = (
  node: HTMLElement,
  data: DraggableData,
  bounds: DragBounds,
  event?: DraggableEvent,
  options?: EdgeResistanceOptions
) => {
  const { x, y } = getResistedPosition(data, bounds, event, options);
  node.style.transform = `translate(${x}px, ${y}px)`;
  return { x, y };
};
