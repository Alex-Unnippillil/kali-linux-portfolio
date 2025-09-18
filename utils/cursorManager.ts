const CURSOR_CLASS_MAP = {
  default: 'cursor-default',
  busy: 'cursor-busy',
  copy: 'cursor-copy',
  move: 'cursor-move',
  'not-allowed': 'cursor-not-allowed',
} as const;

export type CursorState = keyof typeof CURSOR_CLASS_MAP;

const CURSOR_CLASSES = Object.values(CURSOR_CLASS_MAP);

let currentState: CursorState = 'default';
let frameHandle: number | null = null;
let fallbackTimeout: number | null = null;

const isBrowser = () => typeof document !== 'undefined' && typeof window !== 'undefined';

function applyClass(state: CursorState) {
  if (!isBrowser()) return;
  const targets: HTMLElement[] = [];
  if (document.body) targets.push(document.body);
  if (document.documentElement) targets.push(document.documentElement as HTMLElement);
  const className = CURSOR_CLASS_MAP[state];
  targets.forEach((target) => {
    CURSOR_CLASSES.forEach((cls) => target.classList.remove(cls));
    target.classList.add(className);
  });
}

function scheduleApply(state: CursorState) {
  const run = () => {
    applyClass(state);
    frameHandle = null;
    if (fallbackTimeout !== null) {
      window.clearTimeout(fallbackTimeout);
      fallbackTimeout = null;
    }
  };

  if (!isBrowser()) return;

  if (frameHandle !== null && 'cancelAnimationFrame' in window) {
    window.cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
  if (fallbackTimeout !== null) {
    window.clearTimeout(fallbackTimeout);
    fallbackTimeout = null;
  }

  if ('requestAnimationFrame' in window) {
    frameHandle = window.requestAnimationFrame(run);
    fallbackTimeout = window.setTimeout(run, 48);
  } else {
    run();
  }
}

export function setCursorState(state: CursorState) {
  if (!isBrowser()) {
    currentState = state;
    return;
  }
  if (currentState === state) return;
  currentState = state;
  scheduleApply(state);
}

export function resetCursorState() {
  setCursorState('default');
}

export function getCursorState(): CursorState {
  return currentState;
}

if (isBrowser()) {
  applyClass(currentState);
}
