# Mobile browser overscroll regression checklist

Use this list when validating changes that touch global scrolling or gesture handling.

## Target environments

- **iOS Safari** on recent hardware (iOS 16+).
- **Android Chrome** on a device or emulator running Android 12+.

## Preconditions

- Load the production or staging build of the portfolio on the device.
- Ensure no system-level accessibility feature is forcing alternative navigation gestures.

## Test steps

1. **Window swipe guard**
   - Open any desktop window (e.g., Terminal).
   - Perform a horizontal swipe gesture starting within the window surface.
   - Confirm the browser does **not** navigate back/forward.
2. **Edge swipe navigation**
   - Repeat the swipe starting from the very edge of the viewport.
   - Confirm the browser’s native back gesture still activates when the swipe begins at the bezel/edge.
3. **In-app scrolling**
   - Scroll vertically within a window with its own scrollbar (such as the Apps catalog).
   - Verify vertical scrolling remains smooth and does not rubber-band the full page.
4. **History controls**
   - Use the browser UI back/forward buttons or keyboard shortcuts (Cmd/Ctrl + [ or ]).
   - Confirm document navigation continues to work as expected.
5. **Navigation links**
   - Tap a link inside the portfolio (e.g., open an app detail page) and then use the browser back button.
   - Ensure navigation completes and the desktop state restores correctly.

## Expected results

- Horizontal swipes inside window content do not trigger browser history navigation.
- Edge-originating gestures and explicit history controls still work, preserving standard navigation.
- Scroll performance and inertia inside app windows remains unchanged.
