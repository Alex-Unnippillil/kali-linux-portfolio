'use client';

export const HOT_CORNER_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type HotCornerPosition = (typeof HOT_CORNER_POSITIONS)[number];

export const HOT_CORNER_ACTION_IDS = ['none', 'show-desktop', 'app-switcher'] as const;
export type HotCornerActionId = (typeof HOT_CORNER_ACTION_IDS)[number];

export interface HotCornerActionDefinition {
  id: HotCornerActionId;
  label: string;
  description: string;
  hint?: string;
}

export interface HotCornerActionMetadata {
  announcement?: string;
}

export type HotCornerConfiguration = Record<HotCornerPosition, HotCornerActionId>;

export type HotCornerTriggerCallback = (
  corner: HotCornerPosition,
  action: HotCornerActionId,
  metadata?: HotCornerActionMetadata
) => void;

export type HotCornerActionHandler = () => HotCornerActionMetadata | void;
export type HotCornerActionHandlers = Partial<Record<HotCornerActionId, HotCornerActionHandler>>;

export const HOT_CORNER_HOLD_DURATION = 250;

export const HOT_CORNER_ACTION_DEFINITIONS: Record<HotCornerActionId, HotCornerActionDefinition> = {
  none: {
    id: 'none',
    label: 'No Action',
    description: 'This corner does not trigger any desktop shortcut.',
  },
  'show-desktop': {
    id: 'show-desktop',
    label: 'Show Desktop',
    description: 'Minimise open windows to reveal the desktop.',
    hint: `Hold for ${HOT_CORNER_HOLD_DURATION} ms`,
  },
  'app-switcher': {
    id: 'app-switcher',
    label: 'App Switcher',
    description: 'Open the window switcher to change applications quickly.',
    hint: `Hold for ${HOT_CORNER_HOLD_DURATION} ms`,
  },
};

export const DEFAULT_HOT_CORNER_CONFIGURATION: HotCornerConfiguration = {
  'top-left': 'show-desktop',
  'top-right': 'app-switcher',
  'bottom-left': 'none',
  'bottom-right': 'none',
};

const noop: HotCornerActionHandler = () => undefined;

const normaliseHandlers = (
  handlers: HotCornerActionHandlers
): Record<HotCornerActionId, HotCornerActionHandler> => ({
  none: handlers.none ?? noop,
  'show-desktop': handlers['show-desktop'] ?? noop,
  'app-switcher': handlers['app-switcher'] ?? noop,
});

type TimerHandle = ReturnType<typeof setTimeout>;

export class HotCornerController {
  private config: HotCornerConfiguration;
  private handlers: Record<HotCornerActionId, HotCornerActionHandler>;
  private holdMs: number;
  private timers = new Map<HotCornerPosition, TimerHandle>();
  private triggeredDuringHover = new Set<HotCornerPosition>();

  constructor(
    config?: Partial<HotCornerConfiguration>,
    handlers: HotCornerActionHandlers = {},
    holdMs: number = HOT_CORNER_HOLD_DURATION
  ) {
    this.config = { ...DEFAULT_HOT_CORNER_CONFIGURATION, ...(config ?? {}) };
    this.handlers = normaliseHandlers(handlers);
    this.holdMs = holdMs >= 0 ? holdMs : HOT_CORNER_HOLD_DURATION;
  }

  public updateConfiguration(config: Partial<HotCornerConfiguration>) {
    this.config = { ...this.config, ...config };
  }

  public setActionForCorner(corner: HotCornerPosition, action: HotCornerActionId) {
    this.config = { ...this.config, [corner]: action };
  }

  public updateHandlers(handlers: HotCornerActionHandlers) {
    this.handlers = normaliseHandlers({ ...this.handlers, ...handlers });
  }

  public getActionForCorner(corner: HotCornerPosition): HotCornerActionId {
    return this.config[corner] ?? 'none';
  }

  public getDefinitionForCorner(corner: HotCornerPosition): HotCornerActionDefinition {
    const action = this.getActionForCorner(corner);
    return HOT_CORNER_ACTION_DEFINITIONS[action];
  }

  public handlePointerEnter(
    corner: HotCornerPosition,
    onTriggered?: HotCornerTriggerCallback
  ) {
    this.clearTimer(corner);
    this.triggeredDuringHover.delete(corner);

    const action = this.getActionForCorner(corner);
    if (action === 'none') {
      return;
    }

    const timer = setTimeout(() => {
      if (this.triggeredDuringHover.has(corner)) {
        return;
      }
      this.triggeredDuringHover.add(corner);
      this.clearTimer(corner);
      const metadata = this.executeAction(action);
      onTriggered?.(corner, action, metadata);
    }, this.holdMs);

    this.timers.set(corner, timer);
  }

  public handlePointerLeave(corner: HotCornerPosition) {
    this.clearTimer(corner);
    this.triggeredDuringHover.delete(corner);
  }

  public dispose() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.triggeredDuringHover.clear();
  }

  private executeAction(action: HotCornerActionId): HotCornerActionMetadata | void {
    const handler = this.handlers[action];
    return handler?.();
  }

  private clearTimer(corner: HotCornerPosition) {
    const timer = this.timers.get(corner);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(corner);
    }
  }
}
