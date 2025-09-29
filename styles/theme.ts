/**
 * Shared design utilities for styling interactive states.
 * Focus ring helpers meet WCAG 2.4.7 (Focus Visible) by
 * rendering a 2px outline with sufficient contrast and
 * offset so it is discernible against surrounding surfaces.
 */
export const focusRing = Object.freeze({
  /**
   * Default focus treatment for buttons and actionable elements.
   */
  default:
    'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-surface',
  /**
   * Tight focus indicator for compact controls like icon buttons.
   */
  tight:
    'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-1 focus-visible:ring-offset-kali-surface',
  /**
   * Inset focus indicator for inputs that already have an outer border.
   */
  inset:
    'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kali-focus focus-visible:ring-offset-0',
});

export type FocusRingVariant = keyof typeof focusRing;

export const getFocusRing = (variant: FocusRingVariant = 'default'): string =>
  focusRing[variant];
