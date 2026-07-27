# About Alex Page Navigation Guide

The `/about-alex` page now ships with a sticky navigation rail that keeps key sections within reach on desktop and mobile viewports. This document explains how to use it, how keyboard support behaves, and what to verify when testing on different screen sizes.

## Desktop usage
- The section rail appears on the left side of the page and stays in view as you scroll.
- Click or press **Enter** on any section name to smoothly scroll the main content to that section.
- The section currently in view receives a highlight in the rail and exposes its description text.

## Mobile usage
- Tap the **Show sections** button near the page heading to reveal the navigation list.
- The list opens as a lightweight dialog; the active section is focused automatically.
- Selecting a section closes the dialog, restores focus to the toggle button, and scrolls to the requested content.
- Dismiss the dialog at any time with the **Hide sections** button, by tapping outside of the panel, or by pressing **Escape** on a hardware keyboard.

## Keyboard support
- The section buttons use a roving `tabIndex` pattern. When the rail or mobile dialog has focus, use **Arrow Up/Down** (or **Arrow Left/Right**) to move between entries. **Home** jumps to the first section; **End** jumps to the last.
- Activate a section with **Enter** or **Space**. Focus moves to the section heading after scrolling completes so screen-reader and keyboard users resume reading context immediately.
- In the mobile dialog, **Escape** closes the menu and returns focus to the toggle control for consistent navigation.

## Testing checklist
- **Desktop (≥1024px width):** Verify the rail stays sticky while scrolling, the active section highlight tracks your position, and keyboard roving works as described.
- **Mobile (≤768px width):** Confirm the section toggle button announces its expanded state, the dialog traps focus while open, and focus is restored to the toggle after selection or dismissal.
- **Reduced motion:** With `prefers-reduced-motion` enabled, ensure navigation jumps instantly without smooth scrolling while headings still receive focus.

Following these steps ensures the sticky navigation remains accessible across screen sizes and input methods.
