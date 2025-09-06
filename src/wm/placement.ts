import type { WorkspaceMargins } from '../state/workspace';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getMaximizedRect(margins: WorkspaceMargins): Rect {
  const width = window.innerWidth - margins.left - margins.right;
  const height = window.innerHeight - margins.top - margins.bottom;
  return {
    x: margins.left,
    y: margins.top,
    width,
    height,
  };
}

