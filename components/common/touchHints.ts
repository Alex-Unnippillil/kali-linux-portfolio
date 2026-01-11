export interface TouchHint {
  gesture: string;
  action: string;
}

export const TOUCH_HINTS: TouchHint[] = [
  {
    gesture: 'Double-tap the desktop background',
    action: 'Open the applications menu without a keyboard.',
  },
  {
    gesture: 'Press and hold on a window title bar',
    action: 'Drag windows or reveal the move/resize handles.',
  },
  {
    gesture: 'Two-finger tap',
    action: 'Show the context menu that normally appears on right-click.',
  },
  {
    gesture: 'Swipe up from the dock',
    action: 'Peek at running apps and switch focus.',
  },
];
