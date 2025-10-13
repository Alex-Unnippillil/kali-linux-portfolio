export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface SerializedWindowState {
  id: string;
  position?: WindowPosition;
  size?: WindowSize;
  context?: Record<string, unknown>;
}
