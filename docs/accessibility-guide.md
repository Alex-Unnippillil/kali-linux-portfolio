# Accessibility Guide

This guide documents focus management and indicator conventions across the Kali Linux Portfolio desktop. Use it when auditing UI changes or introducing new interactive components.

## Focus tokens and utility class

- Focus appearance is controlled by the design tokens in `styles/tokens.css`:
  - `--focus-outline-color` always inherits the current accent color so high-contrast themes swap the ring automatically.
  - `--focus-outline-width` and `--focus-outline-offset` size the outline for standard and high-contrast modes.
  - `--focus-ring-shadow` adds the glow used by the `.focus-ring` helper class.
- Apply the `.focus-ring` class to buttons, icons, menu items and other focusable controls to ensure they opt into the shared focus treatment.
- Inputs, sliders and textareas that need the glow but cannot use utility classes (for example those styled in plain CSS) should reference the same tokens in their `:focus-visible` rules.

## Keyboard order and custom flows

- Desktop app icons (`UbuntuApp`), taskbar entries and sidebar icons are tabbable and use `.focus-ring` so keyboard users receive the same accent outline.
- Context menus rely on the `useRovingTabIndex` hook. Only actionable items participate in the roving order—items with `aria-disabled="true"` remain unfocusable by design.
- The boot screen power control is now a real `<button>` and is disabled while the system is still starting. When the desktop is shut down the control becomes focusable again and exposes the accent focus ring.
- The window title bar (`WindowTopBar`) is keyboard-grabbable and uses `tabIndex={0}` plus `.focus-ring` so users can move windows without a mouse.

## Exceptions to highlight

- Some legacy in-app controls (for example, historical mini-games) still rely on bespoke focus styles. When modernising those areas, remove any remaining `outline: none` overrides and adopt the shared tokens.
- Disabled menu entries intentionally skip the focus order to avoid trapping the Tab key on unavailable actions. Document new exceptions in this file whenever you add similar patterns.

