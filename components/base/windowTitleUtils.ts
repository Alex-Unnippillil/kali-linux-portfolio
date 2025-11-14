export const TITLE_TRUNCATION_EPSILON = 1;

export function isElementTextTruncated(node: HTMLElement | null): boolean {
  if (!node) {
    return false;
  }

  const clientWidth = node.clientWidth;
  const scrollWidth = node.scrollWidth;

  if (!Number.isFinite(clientWidth) || !Number.isFinite(scrollWidth)) {
    return false;
  }

  return scrollWidth - clientWidth > TITLE_TRUNCATION_EPSILON;
}
