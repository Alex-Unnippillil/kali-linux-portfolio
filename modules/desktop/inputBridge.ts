const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'password',
  'email',
  'number',
  'textarea',
]);

export type TextLikeElement = HTMLInputElement | HTMLTextAreaElement;
export type EditableElement = TextLikeElement | HTMLElement;

type InputSelection = {
  kind: 'input';
  start: number;
  end: number;
};

type ContentEditableSelection = {
  kind: 'contenteditable';
  range: Range;
};

export type EditableSnapshot = {
  element: EditableElement;
  selection?: InputSelection | ContentEditableSelection;
};

const isTextInputElement = (element: Element | null): element is TextLikeElement => {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
  if (element instanceof HTMLInputElement) {
    if (element.readOnly || element.disabled) return false;
    const type = element.type?.toLowerCase();
    return TEXT_INPUT_TYPES.has(type || 'text');
  }
  return false;
};

const isContentEditable = (element: Element | null): element is HTMLElement => {
  if (!element) return false;
  return element instanceof HTMLElement && element.isContentEditable;
};

export const getActiveEditable = (): EditableElement | null => {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (isTextInputElement(active) || isContentEditable(active)) {
    return active as EditableElement;
  }
  if (active instanceof HTMLElement && active.shadowRoot) {
    const shadowActive = active.shadowRoot.activeElement;
    if (isTextInputElement(shadowActive) || isContentEditable(shadowActive)) {
      return shadowActive as EditableElement;
    }
  }
  return null;
};

export const captureEditableSnapshot = (): EditableSnapshot | null => {
  if (typeof window === 'undefined') return null;
  const element = getActiveEditable();
  if (!element) return null;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    return {
      element,
      selection: {
        kind: 'input',
        start,
        end,
      },
    };
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return {
        element,
        selection: {
          kind: 'contenteditable',
          range: selection.getRangeAt(0).cloneRange(),
        },
      };
    }
    return { element };
  }

  return null;
};

export const focusEditableElement = (element: EditableElement | null): boolean => {
  if (!element || typeof element.focus !== 'function') return false;
  element.focus();
  return true;
};

export const restoreEditableSnapshot = (snapshot: EditableSnapshot | null): boolean => {
  if (typeof window === 'undefined' || !snapshot) return false;
  const { element, selection } = snapshot;
  if (!focusEditableElement(element)) return false;

  if (!selection) {
    return true;
  }

  if (selection.kind === 'input' && element instanceof HTMLInputElement) {
    element.setSelectionRange(selection.start, selection.end);
    return true;
  }

  if (selection.kind === 'input' && element instanceof HTMLTextAreaElement) {
    element.setSelectionRange(selection.start, selection.end);
    return true;
  }

  if (
    selection.kind === 'contenteditable' &&
    element instanceof HTMLElement &&
    element.isContentEditable
  ) {
    const windowSelection = window.getSelection();
    if (!windowSelection) return false;
    windowSelection.removeAllRanges();
    windowSelection.addRange(selection.range.cloneRange());
    return true;
  }

  return false;
};

const dispatchInputEvents = (element: HTMLElement) => {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

export const insertText = (
  text: string,
  target?: EditableElement | null
): boolean => {
  if (typeof document === 'undefined') return false;
  const element = (target ?? getActiveEditable()) as EditableElement | null;
  if (!element) return false;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const value = element.value;
    const newValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    element.value = newValue;
    const caret = start + text.length;
    element.setSelectionRange(caret, caret);
    dispatchInputEvents(element);
    return true;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    const selection = window.getSelection();
    if (!selection) return false;
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.addRange(range);
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    dispatchInputEvents(element);
    return true;
  }

  return false;
};

export const canInsert = (snapshot?: EditableSnapshot | null): boolean => {
  if (snapshot?.element) return true;
  return getActiveEditable() !== null;
};

export default {
  getActiveEditable,
  captureEditableSnapshot,
  restoreEditableSnapshot,
  focusEditableElement,
  insertText,
  canInsert,
};
