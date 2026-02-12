import {
  LAYOUT_PRESET_LABELS,
  LAYOUT_PRESETS,
  LayoutPresetName,
  StoredRect,
  StoredWindowLayout,
  WindowLayoutRepository,
  createWindowLayoutRepository,
} from '@/utils/storage/windowLayouts';

export type Rect = StoredRect;

export interface WindowPlacement extends Rect {
  id: string;
}

export interface WindowPresetAssignment {
  preset: LayoutPresetName;
  slotIndex: number;
}

export interface SnapTarget {
  id: string;
  preset: LayoutPresetName;
  slotIndex: number;
  rect: Rect;
  label: string;
}

export interface WindowManagerOptions {
  displayId: string;
  viewport: Rect;
  repository?: WindowLayoutRepository;
  initialOrder?: string[];
  defaultPreset?: LayoutPresetName | null;
}

const isLayoutPreset = (value: string): value is LayoutPresetName =>
  (LAYOUT_PRESETS as readonly string[]).includes(value);

const normalizeRect = (rect: Rect): Rect => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
});

const formatTargetLabel = (
  preset: LayoutPresetName,
  index: number,
  total: number
): string => {
  const base = LAYOUT_PRESET_LABELS[preset];
  if (total <= 1) return base;
  return `${base} ${index + 1} of ${total}`;
};

const DEFAULT_MAIN_RATIO = 2 / 3;

const computePresetRects = (
  preset: LayoutPresetName,
  viewport: Rect,
  count: number
): Rect[] => {
  const { x, y, width, height } = viewport;
  const full: Rect = { x, y, width, height };

  switch (preset) {
    case 'split-50-50': {
      if (count <= 1) return [full];
      const halfWidth = width / 2;
      return [
        { x, y, width: halfWidth, height },
        { x: x + halfWidth, y, width: width - halfWidth, height },
      ];
    }
    case 'thirds': {
      const columnWidth = width / 3;
      return [
        { x, y, width: columnWidth, height },
        { x: x + columnWidth, y, width: columnWidth, height },
        { x: x + columnWidth * 2, y, width: width - columnWidth * 2, height },
      ];
    }
    case 'seventy-thirty': {
      if (count <= 1) return [full];
      const mainWidth = width * 0.7;
      return [
        { x, y, width: mainWidth, height },
        { x: x + mainWidth, y, width: width - mainWidth, height },
      ];
    }
    case 'grid-2x2': {
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      return [
        { x, y, width: halfWidth, height: halfHeight },
        { x: x + halfWidth, y, width: width - halfWidth, height: halfHeight },
        { x, y: y + halfHeight, width: halfWidth, height: height - halfHeight },
        {
          x: x + halfWidth,
          y: y + halfHeight,
          width: width - halfWidth,
          height: height - halfHeight,
        },
      ];
    }
    case 'main-plus-side': {
      if (count <= 1) return [full];
      const mainWidth = width * DEFAULT_MAIN_RATIO;
      const sideWidth = width - mainWidth;
      const sideHeight = height / 2;
      return [
        { x, y, width: mainWidth, height },
        { x: x + mainWidth, y, width: sideWidth, height: sideHeight },
        {
          x: x + mainWidth,
          y: y + sideHeight,
          width: sideWidth,
          height: height - sideHeight,
        },
      ];
    }
    default:
      return [full];
  }
};

const cloneRect = (rect: Rect): Rect => ({ ...rect });

export class WindowManager {
  private repository: WindowLayoutRepository;
  private windows = new Map<string, Rect>();
  private assignments = new Map<string, WindowPresetAssignment>();
  private order: string[] = [];
  private snapshotLoaded = false;
  private snapshot: StoredWindowLayout | null = null;
  private currentPreset: LayoutPresetName | null;
  private viewport: Rect;

  constructor(private options: WindowManagerOptions) {
    this.viewport = cloneRect(options.viewport);
    this.repository = options.repository ?? createWindowLayoutRepository();
    this.currentPreset = options.defaultPreset ?? null;
    if (options.initialOrder) {
      this.order = [...options.initialOrder];
    }
  }

  private get displayId(): string {
    return this.options.displayId;
  }

  private ensureSnapshot(): void {
    if (this.snapshotLoaded) return;
    this.snapshotLoaded = true;
    this.snapshot = this.repository.load(this.displayId) ?? null;
    if (!this.snapshot) return;

    this.currentPreset = this.snapshot.preset;
    this.order = [...this.snapshot.order];

    Object.entries(this.snapshot.positions).forEach(([id, rect]) => {
      this.windows.set(id, cloneRect(rect));
    });

    Object.entries(this.snapshot.assignments).forEach(
      ([id, assignment]) => {
        this.assignments.set(id, {
          preset: assignment.preset,
          slotIndex: assignment.slot,
        });
      }
    );
  }

  private ensureWindowOrder(windowId: string, toFront = false): void {
    this.order = this.order.filter((id) => id !== windowId);
    if (toFront) {
      this.order.unshift(windowId);
    } else {
      this.order.push(windowId);
    }
    this.order = Array.from(new Set(this.order));
  }

  private defaultBounds(): Rect {
    const width = this.viewport.width * 0.6;
    const height = this.viewport.height * 0.6;
    const x = this.viewport.x + (this.viewport.width - width) / 2;
    const y = this.viewport.y + (this.viewport.height - height) / 2;
    return { x, y, width, height };
  }

  private persist(): void {
    if (!this.repository) return;
    const positions: Record<string, Rect> = {};
    for (const [id, rect] of this.windows.entries()) {
      positions[id] = cloneRect(rect);
    }
    const assignments: StoredWindowLayout['assignments'] = {};
    for (const [id, assignment] of this.assignments.entries()) {
      assignments[id] = {
        preset: assignment.preset,
        slot: assignment.slotIndex,
      };
    }

    const order = this.order.filter((id) => this.windows.has(id));

    const snapshot: StoredWindowLayout = {
      preset: this.currentPreset ?? null,
      order,
      positions,
      assignments,
      updatedAt: Date.now(),
    };

    this.repository.save(this.displayId, snapshot);
  }

  private refreshPreset(
    preset: LayoutPresetName,
    priority?: string
  ): void {
    const entries = Array.from(this.assignments.entries()).filter(
      ([, assignment]) => assignment.preset === preset
    );
    if (!entries.length) return;

    const slots = computePresetRects(
      preset,
      this.viewport,
      Math.max(entries.length, 1)
    );
    const slotCount = slots.length || 1;
    const used = new Set<number>();

    const assignSlot = (windowId: string, desired: number) => {
      let slotIndex = ((desired % slotCount) + slotCount) % slotCount;
      if (slotCount > 0 && used.size < slotCount) {
        let attempts = 0;
        while (used.has(slotIndex) && attempts < slotCount) {
          slotIndex = (slotIndex + 1) % slotCount;
          attempts += 1;
        }
      }
      used.add(slotIndex);
      const rect = slots[slotIndex] ?? cloneRect(this.viewport);
      this.assignments.set(windowId, { preset, slotIndex });
      this.windows.set(windowId, cloneRect(rect));
    };

    if (priority) {
      const entry = entries.find(([id]) => id === priority);
      if (entry) {
        assignSlot(entry[0], entry[1].slotIndex);
      }
    }

    for (const [id, assignment] of entries) {
      if (id === priority) continue;
      assignSlot(id, assignment.slotIndex);
    }
  }

  private resolveTarget(target: SnapTarget | string): SnapTarget | null {
    if (typeof target !== 'string') {
      return target;
    }
    const [presetKey, slotPart] = target.split(':');
    if (!presetKey || !slotPart || !isLayoutPreset(presetKey)) {
      return null;
    }
    const slotIndex = Number.parseInt(slotPart, 10);
    if (Number.isNaN(slotIndex)) return null;

    const slots = computePresetRects(
      presetKey,
      this.viewport,
      Math.max(this.windows.size, slotIndex + 1, 1)
    );
    const rect = slots[slotIndex];
    if (!rect) {
      return null;
    }
    return {
      id: `${presetKey}:${slotIndex}`,
      preset: presetKey,
      slotIndex,
      rect,
      label: formatTargetLabel(presetKey, slotIndex, slots.length),
    };
  }

  public getCurrentPreset(): LayoutPresetName | null {
    this.ensureSnapshot();
    return this.currentPreset;
  }

  public setViewport(viewport: Rect, options: { reflow?: boolean } = {}): void {
    this.viewport = cloneRect(viewport);
    if (options.reflow !== false) {
      const presets = new Set<LayoutPresetName>();
      for (const assignment of this.assignments.values()) {
        presets.add(assignment.preset);
      }
      presets.forEach((preset) => this.refreshPreset(preset));
      this.persist();
    }
  }

  public registerWindow(windowId: string, initialBounds?: Rect): Rect {
    this.ensureSnapshot();

    if (!this.windows.has(windowId)) {
      const stored = this.snapshot?.positions?.[windowId];
      const rect = stored
        ? cloneRect(stored)
        : initialBounds
        ? cloneRect(initialBounds)
        : this.defaultBounds();
      this.windows.set(windowId, normalizeRect(rect));
    } else if (initialBounds) {
      this.windows.set(windowId, cloneRect(initialBounds));
    }

    if (this.snapshot?.assignments?.[windowId]) {
      const assignment = this.snapshot.assignments[windowId];
      this.assignments.set(windowId, {
        preset: assignment.preset,
        slotIndex: assignment.slot,
      });
      this.currentPreset = assignment.preset;
    }

    this.ensureWindowOrder(windowId);
    return cloneRect(this.windows.get(windowId)!);
  }

  public unregisterWindow(windowId: string): void {
    this.ensureSnapshot();
    this.windows.delete(windowId);
    this.assignments.delete(windowId);
    this.order = this.order.filter((id) => id !== windowId);
    this.persist();
  }

  public updateWindowBounds(windowId: string, rect: Rect): void {
    this.ensureSnapshot();
    this.windows.set(windowId, cloneRect(rect));
    this.persist();
  }

  public getWindowBounds(windowId: string): Rect | undefined {
    this.ensureSnapshot();
    const rect = this.windows.get(windowId);
    return rect ? cloneRect(rect) : undefined;
  }

  public getWindows(): WindowPlacement[] {
    this.ensureSnapshot();
    const seen = new Set<string>();
    const ordered: WindowPlacement[] = [];
    for (const id of this.order) {
      const rect = this.windows.get(id);
      if (!rect) continue;
      ordered.push({ id, ...cloneRect(rect) });
      seen.add(id);
    }
    for (const [id, rect] of this.windows.entries()) {
      if (seen.has(id)) continue;
      ordered.push({ id, ...cloneRect(rect) });
    }
    return ordered;
  }

  public applyPreset(
    preset: LayoutPresetName,
    options: { persist?: boolean } = {}
  ): Record<string, Rect> {
    this.ensureSnapshot();
    const windows = this.getWindows();
    if (!windows.length) {
      this.currentPreset = preset;
      if (options.persist !== false) {
        this.persist();
      }
      return {};
    }

    const slots = computePresetRects(preset, this.viewport, windows.length);
    const slotCount = slots.length || 1;
    const placements: Record<string, Rect> = {};

    this.assignments.clear();

    windows.forEach((window, index) => {
      const slotIndex = slotCount ? index % slotCount : 0;
      const rect = slots[slotIndex] ?? cloneRect(this.viewport);
      this.windows.set(window.id, cloneRect(rect));
      this.assignments.set(window.id, { preset, slotIndex });
      placements[window.id] = cloneRect(rect);
    });

    this.currentPreset = preset;
    if (options.persist !== false) {
      this.persist();
    }
    return placements;
  }

  public cyclePreset(step = 1): LayoutPresetName {
    this.ensureSnapshot();
    const current = this.currentPreset;
    const currentIndex = current ? LAYOUT_PRESETS.indexOf(current) : -1;
    const nextIndex =
      (currentIndex + step + LAYOUT_PRESETS.length) % LAYOUT_PRESETS.length;
    const nextPreset = LAYOUT_PRESETS[nextIndex];
    this.applyPreset(nextPreset);
    return nextPreset;
  }

  public getAssignments(): Record<string, WindowPresetAssignment> {
    this.ensureSnapshot();
    const result: Record<string, WindowPresetAssignment> = {};
    for (const [id, assignment] of this.assignments.entries()) {
      result[id] = { ...assignment };
    }
    return result;
  }

  public getSnapTargets(options: {
    preset?: LayoutPresetName;
    includeAll?: boolean;
  } = {}): SnapTarget[] {
    this.ensureSnapshot();
    const count = Math.max(this.windows.size, 1);
    const { preset, includeAll = false } = options;

    const buildTargets = (layout: LayoutPresetName): SnapTarget[] => {
      const slots = computePresetRects(layout, this.viewport, count);
      return slots.map((rect, index) => ({
        id: `${layout}:${index}`,
        preset: layout,
        slotIndex: index,
        rect: cloneRect(rect),
        label: formatTargetLabel(layout, index, slots.length),
      }));
    };

    if (includeAll) {
      return LAYOUT_PRESETS.flatMap((name) => buildTargets(name));
    }

    const activePreset = preset ?? this.currentPreset ?? 'split-50-50';
    return buildTargets(activePreset);
  }

  public snapWindowToTarget(
    windowId: string,
    target: SnapTarget | string
  ): Rect | null {
    this.ensureSnapshot();
    if (!this.windows.has(windowId)) {
      this.registerWindow(windowId);
    }
    const resolved = this.resolveTarget(target);
    if (!resolved) return null;

    this.assignments.set(windowId, {
      preset: resolved.preset,
      slotIndex: resolved.slotIndex,
    });
    this.currentPreset = resolved.preset;
    this.ensureWindowOrder(windowId, true);
    this.refreshPreset(resolved.preset, windowId);
    this.persist();
    return cloneRect(this.windows.get(windowId)!);
  }

  public clearPersistentLayout(): void {
    this.assignments.clear();
    this.currentPreset = null;
    this.repository.clear(this.displayId);
    this.persist();
  }

  public exportLayout(): StoredWindowLayout {
    this.ensureSnapshot();
    const positions: Record<string, Rect> = {};
    for (const [id, rect] of this.windows.entries()) {
      positions[id] = cloneRect(rect);
    }
    const assignments: StoredWindowLayout['assignments'] = {};
    for (const [id, assignment] of this.assignments.entries()) {
      assignments[id] = {
        preset: assignment.preset,
        slot: assignment.slotIndex,
      };
    }
    return {
      preset: this.currentPreset,
      order: this.order.filter((id) => this.windows.has(id)),
      positions,
      assignments,
      updatedAt: Date.now(),
    };
  }
}

export const getPresetRects = (
  preset: LayoutPresetName,
  viewport: Rect,
  count: number
): Rect[] => computePresetRects(preset, viewport, count);
