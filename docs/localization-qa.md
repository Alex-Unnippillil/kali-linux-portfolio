# Localization Readiness QA Checklist

Use this checklist before sign-off whenever strings, layouts, or locale settings change.

## Environment preparation
- Enable the developer quick settings menu and toggle **Pseudolocalize strings** to surface expansion issues.
- Toggle **RTL layout** to validate direction-sensitive components.
- Verify that both toggles persist across reloads so regression testing is repeatable.

## Functional verification
- Confirm that navigation chrome (navbar, taskbar, context menus) renders without clipping or misalignment in RTL.
- Open several desktop applications and ensure window chrome, focus rings, and drag interactions still work in RTL.
- Check form inputs and text areas to ensure caret direction and alignment follow the locale direction.
- Validate that pseudo strings wrap correctly without overflowing buttons or truncating accessibility labels.
- Ensure dynamic content (notifications, toasts, modals) respects the active direction and does not anchor off-screen.

## Accessibility and assistive tech
- Inspect that screen reader announcements use the expected language attribute (`lang`) and update when locale changes.
- Verify focus order remains logical when direction switches (e.g., tabbing across the navbar and taskbar).
- Confirm that high-contrast and reduced motion preferences remain functional while pseudo and RTL toggles are active.

## Regression checks
- Run automated smoke tests (`yarn lint`, `yarn test`) to catch layout regressions introduced by direction-aware CSS.
- Spot-check exported/static builds if they rely on prerendered markup for locale-sensitive routes.
- Review analytics events to ensure pseudo/RTL toggles do not emit personally identifiable information or unstable labels.

Document any failures, remediation steps, and the build hash tested.
