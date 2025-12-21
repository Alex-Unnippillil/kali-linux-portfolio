import React from 'react';

export type SnapPosition =
    | 'left'
    | 'right'
    | 'top'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

export type SnapPreview = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type WindowSize = { width: number; height: number };

export type WindowBounds = WindowSize & { x?: number; y?: number };

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type ViewportMetrics = { width: number; height: number; left: number; top: number };

export interface ResizeSession {
    direction: ResizeDirection;
    pointerId?: number;
    startPointerX: number;
    startPointerY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    currentX?: number;
    currentY?: number;
    currentWidth?: number;
    currentHeight?: number;
    viewportWidth: number;
    viewportHeight: number;
    viewportLeft: number;
    viewportTop: number;
    handle: EventTarget | null;
    didResize: boolean;
    topOffset?: number;
    safeAreaBottom?: number;
    snapBottomInset?: number;
}

export interface WindowProps {
    id: string;
    title: string;
    screen: (addFolder?: any, openApp?: any, context?: any) => React.ReactNode;
    addFolder?: any;
    openApp?: any;
    context?: any;
    defaultWidth?: number;
    defaultHeight?: number;
    initialX?: number;
    initialY?: number;
    minWidth?: number;
    minHeight?: number;
    snapGrid?: number[];
    snapEnabled?: boolean;
    resizable?: boolean;
    minimized?: boolean;
    isFocused?: boolean;
    focus?: (id: string | null) => void;
    allowMaximize?: boolean;
    hasMinimised?: (id: string | null) => void;
    closed?: (id: string) => void;
    overlayRoot?: string | HTMLElement;
    zIndex?: number;
    onSizeChange?: (width: number, height: number) => void;
    onPositionChange?: (x: number, y: number) => void;
}

export interface WindowState {
    cursorType: string;
    width: number;
    height: number;
    closed: boolean;
    maximized: boolean;
    preMaximizeBounds: WindowBounds | null;
    parentSize: { height: number; width: number };
    safeAreaTop: number;
    snapPreview: SnapPreview | null;
    snapPosition: SnapPosition | null;
    snapped: SnapPosition | null;
    lastSize: WindowSize | null;
    grabbed: boolean;
    minWidth: number;
    minHeight: number;
    resizing: ResizeDirection | null;
    viewportOffset?: { left: number; top: number };
}

export const DEFAULT_MIN_WIDTH = 20;
export const DEFAULT_MIN_HEIGHT = 20;
