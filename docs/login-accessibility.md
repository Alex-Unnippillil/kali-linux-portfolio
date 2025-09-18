# Accessible Login Flow

The login greeter now presents a dedicated accessibility panel so visitors can personalize the simulated
experience before entering the desktop. This document summarizes what each option does, how focus is
managed, and the automated checks that keep the screen compliant.

## Accessibility toggles

The preference panel exposes three persistent controls. Each control is implemented as a toggle button with
`aria-pressed` state, labelled help text, and live announcements from the status region.

- **High contrast theme** &mdash; Applies the portfolio design system&apos;s high-contrast token set. The toggle adds
  the `high-contrast` class to `<body>` so global CSS variables (for example `--color-bg` and
  `--color-ub-border-orange`) switch to their bright variants. All panels and form elements immediately pick up
  the new palette.
- **Screen reader hints** &mdash; Adds descriptive helper text to every form field and keeps guidance in an
  `aria-live="polite"` note. The greeter&apos;s main region references these descriptions through
  `aria-describedby`, ensuring narrators explain the extra context without moving focus.
- **Keyboard navigation guide** &mdash; Emphasizes focus outlines by adding `keyboard-nav-mode` on `<body>` and
  reveals a navigable list that documents the intended tab sequence. The skip link receives the same styling,
  making it easier to spot when tabbing through the page.

## Focus order and announcements

1. **Skip link** &mdash; Lands directly on the main content and is styled when focused so keyboard users can see it.
2. **Accessibility toggles** &mdash; High contrast, screen reader hints, and the keyboard navigation guide share a
   single group to preserve reading order.
3. **Login form** &mdash; Username, password, and the launch button expose concise labels, with optional helper
   text injected when screen reader hints are enabled.
4. **Live announcements** &mdash; A persistent `role="status"` region summarises the latest toggle state and any
   form submission acknowledgement. The region never steals focus, keeping the interaction flow predictable.

## Automated accessibility test

Run the Playwright + axe regression to confirm the greeter stays compliant:

```bash
npx playwright test tests/accessibility/login.test.ts
```

The suite performs an axe analysis scoped to `<main>` and verifies that each toggle updates the live status
region, theme classes, and helper panels.

## Tips for assistive technology users

- The launch workflow is a simulation. Enter any memorable username to hear it echoed in the confirmation
  message before continuing.
- Toggle combinations persist while the page remains open. Switch back to the defaults at any time, and the
  live region will announce the change without shifting focus.
- The greeter respects reduced motion preferences inherited from the operating system, so color changes and
  panel reveals are instant with no animation when motion is disabled.
