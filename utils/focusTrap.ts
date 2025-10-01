export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  '[role="button"]',
].join(',');

const isElementHidden = (element: HTMLElement): boolean => {
  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  if (element.hasAttribute('hidden')) {
    return true;
  }
  const style = typeof window !== 'undefined' && window.getComputedStyle
    ? window.getComputedStyle(element)
    : null;
  if (style) {
    if (style.visibility === 'hidden' || style.display === 'none') {
      return true;
    }
  }
  return false;
};

const isDisabled = (element: HTMLElement): boolean => {
  if ('disabled' in element && (element as HTMLButtonElement).disabled) {
    return true;
  }
  if (element.getAttribute('aria-disabled') === 'true') {
    return true;
  }
  return false;
};

export const collectFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const seen = new Set<HTMLElement>();
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  if (container.matches(FOCUSABLE_SELECTORS)) {
    elements.unshift(container);
  }

  const focusable: HTMLElement[] = [];
  for (const el of elements) {
    if (seen.has(el)) continue;
    seen.add(el);
    const tabIndex = el.getAttribute('tabindex');
    if (tabIndex && Number(tabIndex) < 0) {
      continue;
    }
    if (isDisabled(el) || isElementHidden(el)) {
      continue;
    }
    focusable.push(el);
  }
  return focusable;
};

const describeElement = (element: Element | null): string => {
  if (!element || !(element instanceof HTMLElement)) {
    return 'null';
  }
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const label = element.getAttribute('aria-label');
  if (label) {
    return `${tag}[aria-label="${label}"]`;
  }
  const name = element.getAttribute('name');
  if (name) {
    return `${tag}[name="${name}"]`;
  }
  return `${tag}${id}`;
};

export type FocusTrapCheckStatus = 'pass' | 'fail';

export interface FocusTrapCheckOptions {
  id: string;
  label: string;
}

export interface FocusTrapCheckResult {
  id: string;
  label: string;
  status: FocusTrapCheckStatus;
  details: string[];
}

const focusElement = (element: HTMLElement | null) => {
  if (!element) return;
  try {
    if (typeof element.focus === 'function') {
      element.focus({ preventScroll: true } as FocusOptions);
    }
  } catch {
    try {
      element.focus();
    } catch {
      /* ignore */
    }
  }
};

export const runFocusTrapCheck = (
  container: HTMLElement | null,
  { id, label }: FocusTrapCheckOptions,
): FocusTrapCheckResult => {
  const details: string[] = [];
  if (!container) {
    details.push('Focus trap container was not found.');
    return { id, label, status: 'fail', details };
  }

  const tabbable = collectFocusableElements(container);
  if (tabbable.length === 0) {
    details.push('No focusable elements were found inside the trap region.');
    return { id, label, status: 'fail', details };
  }

  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  const previousActive = document.activeElement as HTMLElement | null;

  let status: FocusTrapCheckStatus = 'pass';

  focusElement(first);
  if (document.activeElement !== first) {
    status = 'fail';
    details.push('Failed to move focus to the first focusable element.');
  }

  focusElement(last);
  const forwardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  });
  last.dispatchEvent(forwardEvent);
  const afterForward = document.activeElement;
  if (afterForward !== first) {
    status = 'fail';
    details.push(
      `Tab from the last element moved focus to ${describeElement(
        afterForward,
      )} instead of wrapping to the first element.`,
    );
  }

  focusElement(first);
  const backwardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  first.dispatchEvent(backwardEvent);
  const afterBackward = document.activeElement;
  if (afterBackward !== last) {
    status = 'fail';
    details.push(
      `Shift+Tab from the first element moved focus to ${describeElement(
        afterBackward,
      )} instead of wrapping to the last element.`,
    );
  }

  if (previousActive && previousActive !== document.body) {
    focusElement(previousActive);
  }

  return {
    id,
    label,
    status,
    details,
  };
};
