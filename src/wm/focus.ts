export type FocusModel = 'click' | 'sloppy';

let currentModel: FocusModel = 'click';
let preventSteal = false;
let lastInteraction = 0;

function recordInteraction() {
  lastInteraction = Date.now();
}

function onMouseDown(e: MouseEvent) {
  (e.target as HTMLElement)?.focus?.();
}

function onMouseMove(e: MouseEvent) {
  (e.target as HTMLElement)?.focus?.();
}

function attachListeners() {
  if (typeof window === 'undefined') return;
  if (currentModel === 'click') {
    window.addEventListener('mousedown', onMouseDown);
  } else {
    window.addEventListener('mousemove', onMouseMove);
  }
}

function detachListeners() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mousemove', onMouseMove);
}

if (typeof window !== 'undefined') {
  ['mousedown', 'keydown', 'touchstart'].forEach((evt) => {
    window.addEventListener(evt, recordInteraction, true);
  });
  window.addEventListener(
    'focusin',
    (e) => {
      if (!preventSteal) return;
      if (Date.now() - lastInteraction > 100) {
        (e.target as HTMLElement)?.blur?.();
      }
    },
    true,
  );
}

export function setFocusModel(model: FocusModel) {
  if (model === currentModel) return;
  detachListeners();
  currentModel = model;
  attachListeners();
}

export function setPreventFocusSteal(value: boolean) {
  preventSteal = value;
}

export function initFocusHandling(model: FocusModel, prevent: boolean) {
  currentModel = model;
  preventSteal = prevent;
  detachListeners();
  attachListeners();
}

