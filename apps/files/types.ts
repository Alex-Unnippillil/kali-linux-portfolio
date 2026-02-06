import type { ModifierState } from '../../src/system/dragdrop';

export type ExplorerItemKind = 'file' | 'directory';

export interface ExplorerItem {
  id: string;
  name: string;
  path: string;
  kind: ExplorerItemKind;
}

export interface ExplorerDragPayload {
  items: ExplorerItem[];
  originPath?: string;
}

export interface ExplorerDropTarget {
  id: string;
  path: string;
  label?: string;
}

export interface ExplorerDestination {
  path: string;
  windowId: string;
}

export interface ExplorerWindowOperations {
  move: (items: ExplorerItem[], destination: ExplorerDestination) => Promise<void> | void;
  copy: (items: ExplorerItem[], destination: ExplorerDestination) => Promise<void> | void;
}

export interface ExplorerWindowOptions {
  windowId: string;
  announce: (message: string) => void;
  operations: ExplorerWindowOperations;
}

export interface ExplorerController {
  beginDrag: (items: ExplorerItem[], originPath?: string) => void;
  registerDropTarget: (target: ExplorerDropTarget) => () => void;
  hoverTarget: (targetId: string, modifiers?: ModifierState) => boolean;
  drop: (targetId: string, modifiers?: ModifierState) => Promise<void>;
  cancelDrag: () => void;
  dispose: () => void;
}
