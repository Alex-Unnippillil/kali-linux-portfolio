# Menu navigation primitives

The Whisker menu, category lists, and quick launchers now share a single navigation model. Use the `useMenuNavigation` hook and the companion CSS to keep behaviour aligned across desktop menus.

## Hook contract

- `useMenuNavigation` lives in `hooks/useMenuNavigation.ts` and exposes keyboard-ready props for your list and item elements.
- Call `getListProps` on the container (`role="menu"` or `role="listbox"`) and `getItemProps` on each actionable element.
- The hook wires up Home/End, Arrow key navigation, `Enter`/`Space` activation, hover intent with a configurable delay, and focus management with optional looping behaviour.
- Each item receives the `data-menu-item`, `data-state`, and `data-disabled` attributes so shared styles can target hover, active, and disabled cases without bespoke className strings.
- To opt into the base visuals, ensure the container carries `data-menu-surface`. Override the CSS variables (`--menu-hover-bg`, `--menu-active-bg`, `--menu-active-color`, `--menu-ring-color`) per menu to match the Kali or Ubuntu palettes.

## Animation & timing budget

These timings keep the UI aligned with the existing Kali desktop cues:

- **Panel reveal** – `TRANSITION_DURATION` stays at `180ms` for the Whisker surface. The hide timer uses the same value so transitions remain symmetric.
- **Category column** – keyboard moves and hover intent run through `useMenuNavigation` with a `140ms` delay, preventing jitter while moving across densely packed options.
- **Application list** – hover intent drops to `110ms` to keep the grid snappy without losing the intentional pause that prevents stray highlights.
- **Keyboard focus** – list navigation always focuses the active button after Arrow/Home/End presses so assistive tech reads the label instantly.

Whenever you introduce a new menu, pick one of the existing delay presets (110ms, 120ms, 140ms) and document exceptions in this file. That keeps the ecosystem predictable for QA and users.

## Smoke testing

Playwright exercises the shared primitives in `tests/menu.smoke.spec.ts`:

- `supports keyboard navigation across categories and apps` toggles the Whisker menu, confirms category and application focus both move via Arrow keys, and asserts the active state updates.
- `applies hover intent delay before highlighting a new app` hovers over a later item and waits for the hook to promote it to `data-state="active"`, guarding against regressions in the shared hover timers.

Run `npx playwright test tests/menu.smoke.spec.ts` after changing menu logic so parity checks continue to match production behaviour.
