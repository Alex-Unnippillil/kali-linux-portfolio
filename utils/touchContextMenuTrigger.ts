export interface PointerEventLike {
  pointerId: number;
  pointerType?: string;
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
  target: EventTarget | null;
  preventDefault?: () => void;
}

export interface TouchContextMenuMeta {
  [key: string]: unknown;
}

export interface TouchContextMenuPayload {
  pointerId: number;
  target: HTMLElement;
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
  meta?: TouchContextMenuMeta;
  originalEvent: PointerEventLike;
}

interface ActivePointerEntry {
  pointerId: number;
  target: HTMLElement;
  timer: ReturnType<typeof setTimeout> | null;
  triggered: boolean;
  startX: number;
  startY: number;
  lastPageX: number;
  lastPageY: number;
  lastClientX: number;
  lastClientY: number;
  meta?: TouchContextMenuMeta;
  originalEvent: PointerEventLike;
}

interface TouchContextMenuTriggerOptions {
  delay?: number;
  getDelay?: () => number;
  moveTolerance?: number;
  onTrigger: (payload: TouchContextMenuPayload) => void;
}

const DEFAULT_DELAY = 600;
const DEFAULT_TOLERANCE = 12;

function resolvePageCoordinate(
  event: PointerEventLike,
  axis: 'X' | 'Y',
): number {
  const pageKey = axis === 'X' ? 'pageX' : 'pageY';
  const clientKey = axis === 'X' ? 'clientX' : 'clientY';
  const pageValue = event[pageKey];
  if (typeof pageValue === 'number' && Number.isFinite(pageValue)) {
    return pageValue;
  }
  const clientValue = event[clientKey];
  if (typeof clientValue === 'number' && Number.isFinite(clientValue)) {
    if (typeof window !== 'undefined') {
      const scrollKey = axis === 'X' ? 'scrollX' : 'scrollY';
      const scrollOffset = (window as typeof window & { [key: string]: number })[scrollKey] || 0;
      return clientValue + scrollOffset;
    }
    return clientValue;
  }
  return 0;
}

export default class TouchContextMenuTrigger {
  private readonly getDelay: () => number;

  private readonly onTrigger: (payload: TouchContextMenuPayload) => void;

  private readonly moveTolerance: number;

  private readonly activePointers = new Map<number, ActivePointerEntry>();

  constructor(options: TouchContextMenuTriggerOptions) {
    const delayResolver =
      typeof options.getDelay === 'function'
        ? options.getDelay
        : () => (typeof options.delay === 'number' ? options.delay : DEFAULT_DELAY);
    this.getDelay = delayResolver;
    this.onTrigger = options.onTrigger;
    this.moveTolerance = typeof options.moveTolerance === 'number' && options.moveTolerance >= 0
      ? options.moveTolerance
      : DEFAULT_TOLERANCE;
  }

  begin(event: PointerEventLike, meta?: TouchContextMenuMeta): boolean {
    if (!event || (event.pointerType && event.pointerType !== 'touch')) {
      return false;
    }
    const targetNode = this.getTargetElement(event.target);
    if (!targetNode) return false;

    const pointerId = event.pointerId;
    if (typeof pointerId !== 'number') return false;

    this.clearPointer(pointerId);

    const entry: ActivePointerEntry = {
      pointerId,
      target: targetNode,
      timer: null,
      triggered: false,
      startX: event.clientX ?? 0,
      startY: event.clientY ?? 0,
      lastPageX: resolvePageCoordinate(event, 'X'),
      lastPageY: resolvePageCoordinate(event, 'Y'),
      lastClientX: event.clientX ?? 0,
      lastClientY: event.clientY ?? 0,
      meta,
      originalEvent: event,
    };

    const delay = Math.max(0, this.getDelay() ?? DEFAULT_DELAY);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      entry.triggered = true;
      this.onTrigger({
        pointerId: entry.pointerId,
        target: entry.target,
        pageX: entry.lastPageX,
        pageY: entry.lastPageY,
        clientX: entry.lastClientX,
        clientY: entry.lastClientY,
        meta: entry.meta,
        originalEvent: entry.originalEvent,
      });
    }, delay);

    this.activePointers.set(pointerId, entry);
    return true;
  }

  move(event: PointerEventLike): void {
    const entry = this.activePointers.get(event.pointerId);
    if (!entry || entry.triggered) return;

    entry.lastClientX = event.clientX ?? entry.lastClientX;
    entry.lastClientY = event.clientY ?? entry.lastClientY;
    entry.lastPageX = resolvePageCoordinate(event, 'X');
    entry.lastPageY = resolvePageCoordinate(event, 'Y');

    const deltaX = (event.clientX ?? entry.startX) - entry.startX;
    const deltaY = (event.clientY ?? entry.startY) - entry.startY;
    if (Math.abs(deltaX) > this.moveTolerance || Math.abs(deltaY) > this.moveTolerance) {
      this.cancel(event.pointerId);
    }
  }

  end(event: PointerEventLike): TouchContextMenuMeta | null {
    const entry = this.activePointers.get(event.pointerId);
    if (!entry) return null;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    this.activePointers.delete(event.pointerId);
    return entry.triggered ? entry.meta || {} : null;
  }

  cancel(eventOrId: PointerEventLike | number): void {
    const pointerId = typeof eventOrId === 'number' ? eventOrId : eventOrId.pointerId;
    if (typeof pointerId !== 'number') return;
    this.clearPointer(pointerId);
  }

  cancelAll(): void {
    this.activePointers.forEach((entry) => {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    });
    this.activePointers.clear();
  }

  dispose(): void {
    this.cancelAll();
  }

  private getTargetElement(target: EventTarget | null): HTMLElement | null {
    if (!target) return null;
    if (target instanceof HTMLElement && typeof target.closest === 'function') {
      const contextElement = target.closest('[data-context]');
      return (contextElement as HTMLElement) || null;
    }
    if (target instanceof Element && typeof target.closest === 'function') {
      const contextElement = target.closest('[data-context]');
      return (contextElement as HTMLElement) || null;
    }
    return null;
  }

  private clearPointer(pointerId: number): void {
    const existing = this.activePointers.get(pointerId);
    if (!existing) return;
    if (existing.timer) {
      clearTimeout(existing.timer);
      existing.timer = null;
    }
    this.activePointers.delete(pointerId);
  }
}
