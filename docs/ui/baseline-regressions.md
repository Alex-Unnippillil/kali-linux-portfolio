# UI Baseline Regression Checklist

_Last reviewed with design: 2024-05-16 (Desktop UX guild)._ 

Use this checklist when you need a quick, human read on the Kali/Ubuntu desktop shell after UI, styling, or dependency changes. Run it alongside automated suites so we keep parity between motion, colour, and interaction states.

## Preparation

- [ ] **Reset the environment**
  - **Acceptance steps**
    1. Start the dev server with `yarn dev`.
    2. Clear `localStorage` and refresh to load default wallpaper, favourites, and session data.
    3. Ensure the viewport is set to 1440×900 (or similar desktop width) so shadows and responsive breakpoints match baseline tokens.
  - **Tooling**
    - Use the desktop boot helper in [`playwright.config.ts`](../../playwright.config.ts) to mirror CI viewport defaults before capturing comparisons.

## Window Chrome & Controls

- [ ] **Active window chrome matches baseline**
  - **Acceptance steps**
    1. Launch the “About Alex” window from the dock.
    2. Confirm the title bar gradient, close/minimize/maximize glyphs, and window shadow align with reference screenshots.
    3. Move the window; the focus ring should stay saturated and inactive windows should dim without losing readability.
  - **Tooling**
    - Capture a snapshot in Playwright (`npx playwright test --config=playwright.config.ts`) and compare with the stored baseline for the desktop viewport.

- [ ] **Window controls behave consistently**
  - **Acceptance steps**
    1. Click the minimize, restore, and close controls and verify each updates the taskbar state.
    2. Double-click the title bar to toggle maximize; drag the bar again to restore.
    3. Resize from each edge/corner and confirm the cursor updates and motion snaps in 8 px steps when snapping is enabled.
  - **Tooling**
    - Follow the keyboard interaction coverage in the [Keyboard-Only Window Management Test Plan](../keyboard-only-test-plan.md) when validating focus and shortcuts.

- [ ] **Keyboard and snap shortcuts remain wired**
  - **Acceptance steps**
    1. With a window focused, use <kbd>Alt</kbd>+<kbd>Tab</kbd> to cycle apps and <kbd>Alt</kbd>+<kbd>`</kbd> to cycle within an app.
    2. Use <kbd>Super</kbd>+arrow keys to trigger snapping and <kbd>Shift</kbd>+arrows to resize.
    3. Verify the window switcher overlay appears and dismisses on escape.
  - **Tooling**
    - Run the accessibility smoke in [`playwright/a11y.spec.ts`](../../playwright/a11y.spec.ts) to confirm focus stays trapped inside overlays and restores on close.

## Taskbar & Running Applications

- [ ] **Dock icons show running and focus state**
  - **Acceptance steps**
    1. Launch two distinct apps and confirm each receives a running indicator pill.
    2. Switch focus between them; the active button should highlight while inactive windows retain the indicator bar.
    3. Close one app and confirm the indicator pill clears immediately.
  - **Tooling**
    - Compare behaviour against the expectations documented in the [UI Polish Task List](../TASKS_UI_POLISH.md#A-windowing--desktop-interactions) for indicators and focus styling.

- [ ] **Taskbar click cycles minimize/restore**
  - **Acceptance steps**
    1. Click a focused taskbar icon to minimize the window.
    2. Click the same icon again to restore the window to its previous position.
    3. Repeat while another window is focused to confirm the click brings the minimized window to front rather than opening a duplicate.
  - **Tooling**
    - Keep Playwright devtools open and replay the interactions with `npx playwright test --headed` if the toggle timing drifts.

- [ ] **Taskbar context menu remains accessible**
  - **Acceptance steps**
    1. Open the taskbar context menu via right-click or <kbd>Shift</kbd>+<kbd>F10</kbd> on a running app.
    2. Use arrow keys to move between “Minimize/Restore” and “Close”.
    3. Activate each option and confirm focus returns to the invoking control.
  - **Tooling**
    - Verify focus trap behaviour with [`hooks/useFocusTrap`](../../hooks/useFocusTrap.ts) tests if focus escapes or menus stay open.

## App Grid & Launcher

- [ ] **Show Applications overlay opens and closes cleanly**
  - **Acceptance steps**
    1. Activate the “Show Applications” button in the dock.
    2. Confirm the full-screen overlay fades in with the search box focused.
    3. Press <kbd>Escape</kbd> or click the wallpaper to dismiss and return focus to the dock control.
  - **Tooling**
    - If animations stutter, profile with the Performance tab while running `yarn dev` and cross-check any outstanding items in [`docs/TASKS_UI_POLISH.md`](../TASKS_UI_POLISH.md).

- [ ] **Search filters app catalogue**
  - **Acceptance steps**
    1. Type a known app name and ensure only matching tiles remain.
    2. Clear the search; the full catalogue should repopulate without duplicates.
    3. Verify disabled apps remain visibly disabled and non-interactive.
  - **Tooling**
    - Use the `all-applications` component in [`components/screen/all-applications.js`](../../components/screen/all-applications.js) as the source of truth when debugging filtering logic.

- [ ] **Launching from the grid respects window stack**
  - **Acceptance steps**
    1. Open an app from the grid and confirm the overlay closes automatically.
    2. Ensure the launched app appears focused above existing windows.
    3. Re-open the grid and launch the same app; the existing window should focus instead of duplicating unless multiple windows are supported.
  - **Tooling**
    - When focus jumps unexpectedly, log stack updates with the helpers in [`components/screen/desktop.js`](../../components/screen/desktop.js).

## Desktop Context & Shortcuts

- [ ] **Desktop context menu exposes core actions**
  - **Acceptance steps**
    1. Right-click the wallpaper or press <kbd>Shift</kbd>+<kbd>F10</kbd> with the desktop focused.
    2. Confirm options for creating folders, toggling settings, and clearing sessions appear.
    3. Trigger each option once and verify overlays such as “New folder name” close with Escape and restore focus.
  - **Tooling**
    - Inspect the menu wiring in [`components/context-menus/desktop-menu.js`](../../components/context-menus/desktop-menu.js) if actions or focus restoration regress.

- [ ] **Desktop shortcuts stay in sync with persistence**
  - **Acceptance steps**
    1. Add a new folder through the context menu and confirm it appears both on the desktop and in subsequent sessions.
    2. Remove or rename shortcuts and refresh to ensure the persisted state updates.
    3. Check that pinned apps remain on the dock after reload.
  - **Tooling**
    - Validate storage through the helpers in [`utils/safeStorage.ts`](../../utils/safeStorage.ts) to confirm state survives reloads.

- [ ] **Window switcher overlay remains navigable**
  - **Acceptance steps**
    1. Hold <kbd>Alt</kbd>+<kbd>Tab</kbd> to open the switcher.
    2. Use arrow keys to move between entries and release to focus the selected window.
    3. Verify the overlay closes immediately when all windows are minimized.
  - **Tooling**
    - Combine the overlay test with the [keyboard-only plan](../keyboard-only-test-plan.md) to ensure focus order remains predictable.

---

Document owner: Desktop UX guild. Ping the guild or design lead before changing tone or acceptance language.
