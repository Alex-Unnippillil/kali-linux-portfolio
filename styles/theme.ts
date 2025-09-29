export const WINDOW_CONTROL_SIZE = 44;
export const WINDOW_CONTROL_ICON_SIZE = 16;

export const WINDOW_CHROME_HEIGHT = WINDOW_CONTROL_SIZE;

export const WINDOW_CONTROL_CLASSES = {
  base: 'inline-flex items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ub-window-title disabled:opacity-50 disabled:pointer-events-none',
  defaultState: 'bg-white/10 hover:bg-white/20 active:bg-white/30',
  pinnedState: 'bg-white/20 hover:bg-white/30 active:bg-white/40',
  destructiveState: 'bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 active:bg-opacity-100',
};

export const WINDOW_CONTROL_ICON_CLASS = 'pointer-events-none h-4 w-4';
