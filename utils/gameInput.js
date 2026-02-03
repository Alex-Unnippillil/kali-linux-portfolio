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
