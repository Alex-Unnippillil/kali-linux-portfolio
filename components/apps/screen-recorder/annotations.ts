export type CaptureMode = 'screen' | 'window' | 'region';

export interface Point {
  x: number;
  y: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation =
  | {
      id: string;
      type: 'arrow';
      color: string;
      start: Point;
      end: Point;
    }
  | {
      id: string;
      type: 'rect';
      color: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      id: string;
      type: 'text';
      color: string;
      x: number;
      y: number;
      text: string;
      background: string;
    }
  | {
      id: string;
      type: 'blur';
      x: number;
      y: number;
      width: number;
      height: number;
      intensity: number;
    };

export interface AnnotationState {
  annotations: Annotation[];
  selectedId: string | null;
}

export const createInitialAnnotationState = (): AnnotationState => ({
  annotations: [],
  selectedId: null,
});

export type AnnotationAction =
  | { type: 'ADD'; annotation: Annotation }
  | { type: 'UPDATE'; id: string; changes: Partial<Annotation> }
  | { type: 'REMOVE'; id: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET'; annotations: Annotation[] }
  | { type: 'RESET' };

const updateAnnotation = (
  annotations: Annotation[],
  id: string,
  changes: Partial<Annotation>,
): Annotation[] =>
  annotations.map((annotation) =>
    annotation.id === id ? { ...annotation, ...changes } : annotation,
  );

export const annotationReducer = (
  state: AnnotationState,
  action: AnnotationAction,
): AnnotationState => {
  switch (action.type) {
    case 'ADD':
      return {
        annotations: [...state.annotations, action.annotation],
        selectedId: action.annotation.id,
      };
    case 'UPDATE':
      return {
        ...state,
        annotations: updateAnnotation(
          state.annotations,
          action.id,
          action.changes,
        ),
      };
    case 'REMOVE':
      return {
        annotations: state.annotations.filter(
          (annotation) => annotation.id !== action.id,
        ),
        selectedId:
          state.selectedId === action.id ? null : state.selectedId,
      };
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'SET':
      return { annotations: [...action.annotations], selectedId: null };
    case 'RESET':
      return createInitialAnnotationState();
    default:
      return state;
  }
};

export const isPointWithinRect = (
  point: Point,
  rect: SelectionRect,
): boolean => {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x <= rect.x + rect.width &&
    point.y <= rect.y + rect.height
  );
};

export const normalizeRect = (rect: SelectionRect): SelectionRect => {
  const normalized: SelectionRect = { ...rect };
  if (rect.width < 0) {
    normalized.x = rect.x + rect.width;
    normalized.width = Math.abs(rect.width);
  }
  if (rect.height < 0) {
    normalized.y = rect.y + rect.height;
    normalized.height = Math.abs(rect.height);
  }
  return normalized;
};

export const clampRect = (
  rect: SelectionRect,
  bounds: { width: number; height: number },
): SelectionRect => {
  const normalized = normalizeRect(rect);
  const x = Math.max(0, Math.min(normalized.x, bounds.width));
  const y = Math.max(0, Math.min(normalized.y, bounds.height));
  const width = Math.max(
    0,
    Math.min(normalized.width, bounds.width - x),
  );
  const height = Math.max(
    0,
    Math.min(normalized.height, bounds.height - y),
  );
  return { x, y, width, height };
};
