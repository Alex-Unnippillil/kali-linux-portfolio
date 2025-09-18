# Screen reader experience overview

The desktop shell now exposes explicit landmarks and live regions so assistive
technology can mirror the visual hierarchy of the Kali portfolio UI.

## Desktop workspace

- The primary canvas is rendered as a `<main>` landmark with the accessible name
  "Desktop workspace" so screen reader users can jump to it quickly.
- Open application windows render inside a labelled region ("Open windows") and
  changes in window focus, open, minimize, restore, and close events are
  announced through a polite live region.
- Contextual overlays such as the application launcher, shortcut selector, and
  window switcher emit announcements when they open or close so users understand
  which view currently has focus.

## Taskbar navigation

- The taskbar is announced as navigation (`role="navigation"`) with the label
  "Taskbar". Each running application button reports its pressed state and
  whether it represents the focused window via `aria-pressed` and
  `aria-current`.
- Right-click context menus announce their visibility changes, keeping keyboard
  and screen reader workflows synchronized.

## Application launcher

- The launcher overlay behaves like a modal dialog, exposing
  `role="dialog" aria-modal="true"` with the label "Application launcher".
- The search field is labelled "Search applications" and the grid of shortcuts
  is announced as the "Application shortcuts" region, clarifying what receives
  focus when navigating within the launcher.

## Notification center

- Notifications render inside an `aria-live="polite"` region labelled
  "Notification center" so new messages are read without stealing focus.
- Each application group forms its own labelled region and individual messages
  surface as list items, allowing screen reader users to review notifications in
  context.

Refer to this document when evaluating future UI changes to ensure announcements
remain accurate and avoid duplicating live updates.
