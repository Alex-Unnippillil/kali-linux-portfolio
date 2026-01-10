import type { CSSProperties } from 'react';

type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type PartialSafeAreaInsets = Partial<SafeAreaInsets>;

type DockAlignment = 'bottom' | 'left' | 'right';

type SafeAreaStyleInput = {
  basePadding: number;
  insets?: PartialSafeAreaInsets;
  alignment?: DockAlignment;
};

export function createSafeAreaStyle({
  basePadding,
  insets,
  alignment = 'bottom',
}: SafeAreaStyleInput): CSSProperties {
  const resolvedInsets: SafeAreaInsets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...insets,
  };

  const verticalPadding = Math.max(0, resolvedInsets.bottom);
  const horizontalPadding = Math.max(0, alignment === 'left' ? resolvedInsets.left : resolvedInsets.right);

  const style: CSSProperties = {
    paddingInlineStart: `calc(${basePadding}px + ${resolvedInsets.left}px)`,
    paddingInlineEnd: `calc(${basePadding}px + ${resolvedInsets.right}px)`,
    paddingBlockEnd: `calc(${basePadding}px + ${verticalPadding}px)`,
  };

  if (alignment === 'left' || alignment === 'right') {
    style.paddingBlockStart = `calc(${basePadding}px + ${resolvedInsets.top}px)`;
    style.paddingBlockEnd = `calc(${basePadding}px + ${resolvedInsets.bottom}px)`;
    if (alignment === 'left') {
      style.transform = `translateX(${horizontalPadding}px)`;
    } else {
      style.transform = `translateX(-${horizontalPadding}px)`;
    }
  }

  return style;
}

export interface DesktopMetrics {
  viewportWidth: number;
  viewportHeight: number;
  minMargin: number;
  defaultWidth: number;
  defaultHeight: number;
  safeArea?: PartialSafeAreaInsets;
}

export interface Bounds {
  width: number;
  height: number;
  top: number;
  left: number;
}

export function getPortraitBounds(metrics: DesktopMetrics): Bounds {
  const {
    viewportWidth,
    viewportHeight,
    minMargin,
    defaultWidth,
    defaultHeight,
    safeArea,
  } = metrics;

  const resolvedSafeArea: SafeAreaInsets = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...safeArea,
  };

  const width = Math.min(Math.round(viewportWidth * 0.9), 720);
  const maxHeight = viewportHeight - resolvedSafeArea.top - resolvedSafeArea.bottom - minMargin * 2;
  const height = Math.min(Math.max(Math.round(maxHeight), 360), defaultHeight);

  const left = Math.round((viewportWidth - width) / 2);
  const top = Math.max(
    resolvedSafeArea.top + minMargin,
    Math.round((viewportHeight - height) / 2),
  );

  return { width, height, top, left };
}

export type SwipeDirection = 'left' | 'right';

export interface SwipeShortcutOptions {
  threshold?: number;
  onSwipe: (direction: SwipeDirection) => void;
}

export function registerSwipeShortcut(
  element: HTMLElement,
  { threshold = 48, onSwipe }: SwipeShortcutOptions,
): () => void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let isTracking = false;

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || pointerId !== null) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    isTracking = true;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isTracking || pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) >= threshold) {
      onSwipe(deltaX > 0 ? 'right' : 'left');
      reset();
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (pointerId === event.pointerId) {
      reset();
    }
  };

  const reset = () => {
    pointerId = null;
    startX = 0;
    startY = 0;
    isTracking = false;
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
  };
}

export interface ReachModeLayout {
  container: string;
  actions: string;
  footer: string;
}

export function applyReachModeLayout(
  isReachMode: boolean,
  base: ReachModeLayout,
): ReachModeLayout {
  if (!isReachMode) {
    return base;
  }

  return {
    container: `${base.container} flex-col-reverse gap-3`,
    actions: `${base.actions} flex-row flex-wrap gap-2`,
    footer: `${base.footer} justify-center`,
  };
}

export function createStickySearchProps(
  height: number,
  zIndex = 10,
  safeAreaTop = 0,
): CSSProperties {
  return {
    position: 'sticky',
    top: `calc(${safeAreaTop}px)`,
    zIndex,
    minHeight: `${height}px`,
    paddingTop: `calc(${safeAreaTop}px)`,
    background: 'var(--menu-surface, rgba(16, 20, 24, 0.9))',
    backdropFilter: 'blur(12px)',
  };
}

export interface PrefetchCandidate {
  id: string;
  weight: number;
}

export interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

export function limitMobilePrefetch(
  candidates: PrefetchCandidate[],
  networkInfo?: NetworkInformationLike,
): PrefetchCandidate[] {
  if (!candidates.length) {
    return candidates;
  }

  const saveData = Boolean(networkInfo?.saveData);
  const effectiveType = networkInfo?.effectiveType ?? '4g';
  const isSlowConnection = ['slow-2g', '2g', '3g'].includes(effectiveType);

  if (!saveData && !isSlowConnection) {
    return candidates.slice(0, 3);
  }

  const sorted = [...candidates].sort((a, b) => b.weight - a.weight);
  return sorted.slice(0, 1);
}

export interface MobileTaskStub {
  id: string;
  summary: string;
  paths: string[];
  helper: string;
}

export const mobileTaskStubs: MobileTaskStub[] = [
  {
    id: 'safe-area-dock-padding',
    summary: 'Pad the dock using safe-area insets so icons stay centered and tappable.',
    paths: ['components/screen/desktop.js', 'components/base/dock'],
    helper: 'createSafeAreaStyle',
  },
  {
    id: 'portrait-window-bounds',
    summary: 'Derive portrait window defaults with safe-area aware centering.',
    paths: ['components/base/window/index.tsx', 'hooks/useWindowManager.ts'],
    helper: 'getPortraitBounds',
  },
  {
    id: 'swipe-shortcuts',
    summary: 'Translate horizontal swipes into Super+Arrow shortcuts with minimal shadow work.',
    paths: ['hooks/useGestureBindings.ts', 'components/base/window/ShadowLayer.tsx'],
    helper: 'registerSwipeShortcut',
  },
  {
    id: 'menu-reach-mode',
    summary: 'Offer a reach-friendly layout for launcher actions on narrow screens.',
    paths: ['components/menu/WhiskerMenu.tsx', 'components/apps/settings/stores/menuPreferences.ts'],
    helper: 'applyReachModeLayout',
  },
  {
    id: 'sticky-search',
    summary: 'Keep the launcher search pinned while list content scrolls underneath.',
    paths: ['components/menu/WhiskerMenu.tsx', 'styles/menu.css'],
    helper: 'createStickySearchProps',
  },
  {
    id: 'idle-prefetch-mobile-budget',
    summary: 'Reduce idle prefetching on constrained connections to avoid mobile jank.',
    paths: ['hooks/useIdlePrefetch.ts', 'apps.config.js'],
    helper: 'limitMobilePrefetch',
  },
];
