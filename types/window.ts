import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

export type SnapPosition = 'left' | 'right' | 'top';

export interface WindowGeometry {
  width: number;
  height: number;
}

export interface WindowParentSize {
  width: number;
  height: number;
}

export interface SnapRegion extends WindowGeometry {
  left: number;
  top: number;
}

export interface WindowState {
  cursorType: string;
  width: number;
  height: number;
  closed: boolean;
  maximized: boolean;
  parentSize: WindowParentSize;
  safeAreaTop: number;
  snapPreview: SnapRegion | null;
  snapPosition: SnapPosition | null;
  snapped: SnapPosition | null;
  lastSize: WindowGeometry | null;
  grabbed: boolean;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export type AddFolderHandler = (folderName: string) => void;
export type OpenAppHandler = (id: string, params?: unknown) => void;

export type WindowScreenRenderer = (
  addFolder: AddFolderHandler | null,
  openApp: OpenAppHandler,
  context?: unknown,
) => ReactNode;

export interface WindowCallbacks {
  focus: (id: string) => void;
  hasMinimised: (id: string) => void;
  closed: (id: string) => void;
  openApp: OpenAppHandler;
}

export interface WindowProps extends WindowCallbacks {
  id: string;
  title: string;
  screen: WindowScreenRenderer;
  addFolder?: AddFolderHandler;
  context?: unknown;
  allowMaximize?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  initialX?: number;
  initialY?: number;
  minimized?: boolean;
  isFocused?: boolean;
  resizable?: boolean;
  snapEnabled?: boolean;
  overlayRoot?: string | HTMLElement | null;
  zIndex?: number;
  onPositionChange?: (x: number, y: number) => void;
}

export interface WindowHandle {
  getWindowNode: () => HTMLElement | null;
  handleSuperArrow: (event: CustomEvent<string> | CustomEvent) => void;
  handleDrag: (...args: unknown[]) => void;
  handleStop: () => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  changeCursorToMove: () => void;
  activateOverlay: () => void;
  closeWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  restoreWindow: () => void;
  setWindowPosition: () => void;
  state: WindowState;
}

export interface WindowMainScreenProps {
  screen: WindowScreenRenderer;
  addFolder?: AddFolderHandler | null;
  openApp?: OpenAppHandler;
  context?: unknown;
}
