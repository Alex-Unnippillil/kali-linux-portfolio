export interface InteractiveElementSnapshot {
  element: HTMLElement;
  rect: DOMRect;
  label: string;
  role: string;
  tagName: string;
}

const INTERACTIVE_SELECTORS = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[role="switch"]:not([aria-disabled="true"])',
  '[role="checkbox"]:not([aria-disabled="true"])',
  '[role="radio"]:not([aria-disabled="true"])',
  '[role="slider"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
  'summary',
  'label[for]',
];

const MAX_LABEL_LENGTH = 80;

const normaliseWhitespace = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const isElementHidden = (element: HTMLElement): boolean => {
  if (element.hidden) return true;
  if (element.getAttribute('aria-hidden') === 'true') return true;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true;
  }
  const ancestor = element.closest('[hidden], [aria-hidden="true"]');
  if (ancestor && ancestor !== element) {
    return true;
  }
  return false;
};

const isElementActionable = (element: HTMLElement): boolean => {
  if (element.getAttribute('disabled') !== null) return false;
  if (element.getAttribute('aria-disabled') === 'true') return false;
  return true;
};

const resolveLabel = (element: HTMLElement): string => {
  const ariaLabel = normaliseWhitespace(element.getAttribute('aria-label'));
  if (ariaLabel) {
    return ariaLabel.slice(0, MAX_LABEL_LENGTH);
  }

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/g);
    const labels = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node))
      .map((node) => normaliseWhitespace(node.textContent))
      .filter(Boolean);
    if (labels.length > 0) {
      return labels.join(' ').slice(0, MAX_LABEL_LENGTH);
    }
  }

  const placeholder = normaliseWhitespace(element.getAttribute('placeholder'));
  if (placeholder) {
    return placeholder.slice(0, MAX_LABEL_LENGTH);
  }

  const title = normaliseWhitespace(element.getAttribute('title'));
  if (title) {
    return title.slice(0, MAX_LABEL_LENGTH);
  }

  const text = normaliseWhitespace(element.textContent);
  if (text) {
    return text.slice(0, MAX_LABEL_LENGTH);
  }

  return element.tagName.toLowerCase();
};

const hasRenderableArea = (rect: DOMRect): boolean => rect.width > 0 || rect.height > 0;

export const scanInteractiveElements = (root: ParentNode = document.body): InteractiveElementSnapshot[] => {
  if (typeof window === 'undefined' || !root) {
    return [];
  }

  const elements = Array.from(
    root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS.join(','))
  );

  const seen = new Set<HTMLElement>();
  const results: InteractiveElementSnapshot[] = [];

  for (const element of elements) {
    if (seen.has(element)) continue;
    seen.add(element);

    if (!isElementActionable(element)) continue;
    if (isElementHidden(element)) continue;

    const rect = element.getBoundingClientRect();
    if (!hasRenderableArea(rect)) continue;

    results.push({
      element,
      rect,
      label: resolveLabel(element),
      role: element.getAttribute('role')?.toLowerCase() ?? element.tagName.toLowerCase(),
      tagName: element.tagName.toLowerCase(),
    });
  }

  return results;
};

export default scanInteractiveElements;
