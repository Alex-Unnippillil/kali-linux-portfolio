# Developer Notes

## Motion guardrails

- Use the shared CSS motion tokens defined in `styles/tokens.css` for transition durations and easing. The Tailwind aliases `duration-fast`, `duration-medium`, `duration-slow`, and `ease-motion` map to those tokens.
- UI controls and window chrome should avoid hardcoded millisecond values. Prefer the utility classes above or CSS variables (e.g., `var(--motion-medium)`).
- When `prefers-reduced-motion` is enabled or the `.reduced-motion` helper is set, motion tokens collapse to zero and transitions/animations become instant. Verify interactive changes in Storybook or the local preview with DevTools' "Emulate reduced motion" toggle before shipping animation changes.
