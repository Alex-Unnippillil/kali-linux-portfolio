# Elevation scale

The Kali desktop shell now exposes a six-tier elevation scale that mirrors the surfaces in the UI.  
Design tokens live in [`styles/tokens.css`](../styles/tokens.css) and are surfaced as Tailwind utilities via
`shadow-elevation-{0..6}` in [`tailwind.config.js`](../tailwind.config.js).

## Token mapping

| Token / utility | Typical surfaces | Notes |
| --- | --- | --- |
| `--shadow-elevation-0` (`shadow-elevation-0`) | Flat panels embedded in layouts | No drop shadow; used when a surface is flush with the background. |
| `--shadow-elevation-1` (`shadow-elevation-1`) | Dock / taskbar (`components/screen/taskbar.js`) | Keeps the dock readable while sitting close to wallpaper content. |
| `--shadow-elevation-2` (`shadow-elevation-2`) | Global top bar (`components/screen/navbar.js`) | Slight lift over the dock to prioritise status controls. |
| `--shadow-elevation-3` (`shadow-elevation-3`) | Popovers & context menus (shared `Popover` base, Whisker menu) | Applies to quick settings, context menus, and other transient surfaces. |
| `--shadow-elevation-4` (`shadow-elevation-4`) | Inactive application windows | Matches legacy `.window-shadow` styling while signalling the window is on the desktop plane. |
| `--shadow-elevation-5` (`shadow-elevation-5`) | Active/focused windows | Adds separation so the focused window stands above inactive ones. |
| `--shadow-elevation-6` (`shadow-elevation-6`) | System modals (`components/base/Modal.tsx`) and blocking overlays | Highest contrast layer for dialogs that must sit above the desktop stack. |

## Verification

Visual hierarchy is covered by automated snapshots:

- `__tests__/Popover.test.tsx` asserts the shared popover wrapper renders with `shadow-elevation-3` and responds to outside
  interactions.
- `__tests__/Modal.test.tsx` now checks the modal container carries the `shadow-elevation-6` class.

Run `yarn test` to exercise the assertions before shipping visual changes.
