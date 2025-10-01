export const SHORTCUT_OVERLAY_EVENT = 'shortcut-overlay' as const;

export type ShortcutOverlayHoldState = 'start' | 'end';

export type ShortcutOverlayEventDetail =
  | {
      action: 'hold';
      state: ShortcutOverlayHoldState;
      trigger?: string;
    }
  | { action: 'open' | 'close' };

export type ShortcutOverlayEvent = CustomEvent<ShortcutOverlayEventDetail>;

export const dispatchShortcutOverlayEvent = (
  detail: ShortcutOverlayEventDetail,
) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SHORTCUT_OVERLAY_EVENT, { detail }));
};
