# Theme guidelines

The portfolio shell uses a token-based system so visual changes stay consistent across the desktop, apps, and games. This guide documents how to work with those tokens when you design or implement UI updates.

## Design tokens

- Core tokens live in [`styles/tokens.css`](../styles/tokens.css). They expose base colors (`--color-bg`, `--color-text`), motion values (`--motion-fast`, `--motion-medium`, `--motion-slow`), spacing, and control affordances.
- Component styles should reference these CSS variables instead of hard-coded values. The global theme layer in [`styles/globals.css`](../styles/globals.css) maps the tokens to each named theme via `html[data-theme="*"]` selectors.
- Runtime overrides happen through the settings hook. Calling setters from `useSettings` will update the document-level tokens immediately, so you do not need to manually patch elements.

## High-contrast variant

- High contrast is applied by toggling `data-contrast="high"` on `<html>`. The tokens defined in [`styles/tokens.css`](../styles/tokens.css) and [`styles/globals.css`](../styles/globals.css) respond to this attribute.
- Use the settings app to enable or disable high contrast. The provider persists the preference and the preload script (`public/theme.js`) applies it before hydration to avoid flashes of the default theme.
- When you build new components, rely on the shared color tokens so that high contrast automatically lifts them. Avoid hard-coded color literals except when you explicitly extend the token set.

## Motion guidelines

- Motion values are also tokenized. The base durations are set in `styles/tokens.css` and are consumed throughout `styles/index.css` and interactive components.
- When users enable **Reduced motion**, the settings provider sets `data-motion="reduced"` on the root element. Tokens resolve to 100 ms and a global stylesheet disables non-essential transitions.
- For JS-driven animations, request durations through `getMotionDuration('--motion-medium', fallback)` from [`utils/motion.ts`](../utils/motion.ts). This ensures programmatic animations respect reduced-motion caps.
- New transitions should reference the motion tokens (for example, `var(--motion-fast)`) so that the reduced-motion cap and tests continue to pass.

## Testing

- The Jest suite includes [`__tests__/motionTokens.test.ts`](../__tests__/motionTokens.test.ts) to verify that toggling reduced motion updates the runtime tokens. Add similar coverage if you introduce new motion preferences or token families.
- Run `yarn lint` and `yarn test` before opening a PR to confirm that theme and motion regressions are caught.
