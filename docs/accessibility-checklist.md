# Accessibility Checklist

This project aims to provide an inclusive experience. When adding or modifying components, consider the following:

- **Focus visibility**: All interactive elements must show a visible focus outline. Use the `var(--focus-outline-color)` token to ensure compatibility with high-contrast and colorblind modes.
- **Descriptive labeling**: Provide `aria-label`, `aria-labelledby`, or visible text for controls so assistive technologies can convey purpose.
- **Color contrast**: Use design tokens and CSS variables to maintain at least a 4.5:1 contrast ratio between text and its background. Avoid conveying information with color alone to respect global colorblind settings.
- **Keyboard navigation**: Verify components are operable using only the keyboard and that tab order is logical.
- **Testing**: Run `yarn lint` and `yarn test` before committing, and consider running `yarn a11y` for automated accessibility audits.

Following this checklist helps ensure new features remain accessible to all users.
