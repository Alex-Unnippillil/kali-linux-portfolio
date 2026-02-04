const isTextInput = (el) => {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

export const shouldHandleGameKey = (event, { isFocused = true } = {}) => {
  if (!isFocused) return false;
  if (isTextInput(event.target)) return false;
  return true;
};

export const consumeGameKey = (event) => {
  if (event?.cancelable) {
    event.preventDefault();
  }
  if (event?.stopPropagation) {
    event.stopPropagation();
  }
};

export const isTextInputEventTarget = isTextInput;

export const formatGameKey = (key) => {
  if (!key) return '';
  if (key === ' ') return 'Space';
  const lower = key.toLowerCase();
  if (lower === 'escape') return 'Esc';
  if (lower === 'arrowup') return 'ArrowUp';
  if (lower === 'arrowdown') return 'ArrowDown';
  if (lower === 'arrowleft') return 'ArrowLeft';
  if (lower === 'arrowright') return 'ArrowRight';
  if (key.length === 1) return key.toUpperCase();
  return key;
};
