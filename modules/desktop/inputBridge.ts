const INPUT_BRIDGE_IGNORE_ATTRIBUTE = 'data-input-bridge-ignore';

export type BridgeTargetType = 'input' | 'textarea' | 'contenteditable';

export interface InputTargetSnapshot {
  type: BridgeTargetType;
  label: string;
}

type InputLikeElement = HTMLInputElement | HTMLTextAreaElement;
type EditableElement = InputLikeElement | HTMLElement;

interface StoredTarget {
  element: EditableElement;
  type: BridgeTargetType;
  label: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionDirection?: 'forward' | 'backward' | 'none';
  range?: Range | null;
}

type Subscriber = (target: InputTargetSnapshot | null) => void;

let listenersAttached = false;
let currentTarget: StoredTarget | null = null;
const subscribers = new Set<Subscriber>();

const isInputElement = (element: Element): element is HTMLInputElement =>
  element.tagName === 'INPUT';

const isTextareaElement = (element: Element): element is HTMLTextAreaElement =>
  element.tagName === 'TEXTAREA';

const isContentEditableElement = (element: Element): element is HTMLElement =>
  (element as HTMLElement).isContentEditable;

const isEditableElement = (
  element: Element | null
): element is EditableElement => {
  if (!element) return false;
  return (
    isInputElement(element) ||
    isTextareaElement(element) ||
    isContentEditableElement(element)
  );
};

const isIgnoredElement = (element: Element | null) =>
  !!element?.closest(`[${INPUT_BRIDGE_IGNORE_ATTRIBUTE}]`);

const computeType = (element: EditableElement): BridgeTargetType => {
  if (isTextareaElement(element)) return 'textarea';
  if (isInputElement(element)) return 'input';
  return 'contenteditable';
};

const computeLabel = (element: EditableElement): string => {
  if (isInputElement(element) || isTextareaElement(element)) {
    const label =
      element.getAttribute('aria-label') ||
      element.placeholder ||
      element.name ||
      element.id;
    if (label && label.trim().length > 0) return label;
    return isTextareaElement(element) ? 'text area' : 'input field';
  }

  const label =
    element.getAttribute('aria-label') ||
    element.getAttribute('data-placeholder') ||
    element.getAttribute('placeholder') ||
    element.id;
  if (label && label.trim().length > 0) return label;
  return 'content editable region';
};

const cloneRange = (range: Range | null | undefined) =>
  range ? range.cloneRange() : null;

const notifySubscribers = () => {
  const snapshot =
    currentTarget && currentTarget.element.isConnected
      ? { type: currentTarget.type, label: currentTarget.label }
      : null;
  subscribers.forEach((cb) => cb(snapshot));
};

const captureSelection = (element: EditableElement) => {
  if (!currentTarget || currentTarget.element !== element) return;
  if (isInputElement(element) || isTextareaElement(element)) {
    currentTarget.selectionStart = element.selectionStart ?? element.value.length;
    currentTarget.selectionEnd = element.selectionEnd ?? element.value.length;
    currentTarget.selectionDirection = element.selectionDirection ?? 'none';
    return;
  }

  if (typeof window === 'undefined') return;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    currentTarget.range = cloneRange(selection.getRangeAt(0));
  } else {
    currentTarget.range = null;
  }
};

const setTarget = (element: EditableElement) => {
  currentTarget = {
    element,
    type: computeType(element),
    label: computeLabel(element),
  };
  captureSelection(element);
  notifySubscribers();
};

const clearTargetIfDetached = () => {
  if (currentTarget && !currentTarget.element.isConnected) {
    currentTarget = null;
    notifySubscribers();
  }
};

const captureActiveSelection = () => {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (!active || !isEditableElement(active) || isIgnoredElement(active)) {
    clearTargetIfDetached();
    return;
  }
  if (!currentTarget || currentTarget.element !== active) {
    setTarget(active);
  } else {
    captureSelection(active);
  }
};

const handleFocusIn = (event: FocusEvent) => {
  const target = event.target as Element | null;
  if (!isEditableElement(target) || isIgnoredElement(target)) {
    return;
  }
  setTarget(target);
};

const ensureListeners = () => {
  if (listenersAttached || typeof document === 'undefined') return;
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('selectionchange', captureActiveSelection);
  document.addEventListener('keyup', captureActiveSelection, true);
  document.addEventListener('mouseup', captureActiveSelection, true);
  listenersAttached = true;

  captureActiveSelection();
};

export const ensureInputBridge = () => {
  ensureListeners();
};

export const subscribeToInputTarget = (
  subscriber: Subscriber
): (() => void) => {
  ensureListeners();
  subscribers.add(subscriber);
  subscriber(
    currentTarget && currentTarget.element.isConnected
      ? { type: currentTarget.type, label: currentTarget.label }
      : null
  );
  return () => {
    subscribers.delete(subscriber);
  };
};

export const insertText = (text: string): boolean => {
  ensureListeners();
  if (!currentTarget) return false;
  const { element } = currentTarget;
  if (!element.isConnected) {
    currentTarget = null;
    notifySubscribers();
    return false;
  }

  if (isInputElement(element) || isTextareaElement(element)) {
    element.focus();
    const start = currentTarget.selectionStart ?? element.value.length;
    const end = currentTarget.selectionEnd ?? element.value.length;
    const prefix = element.value.slice(0, start);
    const suffix = element.value.slice(end);
    element.value = `${prefix}${text}${suffix}`;
    const caret = start + text.length;
    element.setSelectionRange(caret, caret, currentTarget.selectionDirection);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    captureSelection(element);
    return true;
  }

  if (typeof document === 'undefined') return false;
  const editable = element as HTMLElement;
  editable.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  let range = cloneRange(currentTarget.range);
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
  }
  selection?.addRange(range);

  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch (err) {
    inserted = false;
  }

  if (!inserted && range) {
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    selection?.collapseToEnd();
    inserted = true;
  }

  if (inserted) {
    captureSelection(editable);
  }
  return inserted;
};

export const focusLastTarget = (): boolean => {
  ensureListeners();
  if (!currentTarget) return false;
  const { element } = currentTarget;
  if (!element.isConnected) {
    currentTarget = null;
    notifySubscribers();
    return false;
  }

  element.focus();
  if (isInputElement(element) || isTextareaElement(element)) {
    const position =
      currentTarget.selectionEnd ??
      currentTarget.selectionStart ??
      element.value.length;
    element.setSelectionRange(position, position, currentTarget.selectionDirection);
    return true;
  }

  if (typeof document === 'undefined') return false;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  const range = cloneRange(currentTarget.range);
  if (range) {
    selection?.addRange(range);
  } else {
    const fallback = document.createRange();
    fallback.selectNodeContents(element);
    fallback.collapse(false);
    selection?.addRange(fallback);
  }
  return true;
};

export const hasEditableTarget = (): boolean => {
  ensureListeners();
  return !!(currentTarget && currentTarget.element.isConnected);
};

export const getInputTargetSnapshot = (): InputTargetSnapshot | null => {
  ensureListeners();
  return currentTarget && currentTarget.element.isConnected
    ? { type: currentTarget.type, label: currentTarget.label }
    : null;
};

export { INPUT_BRIDGE_IGNORE_ATTRIBUTE };
