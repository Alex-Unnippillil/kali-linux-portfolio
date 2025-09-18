# Window rules

The desktop supports a small rules engine that automatically adjusts new windows as soon as they are created and whenever the monitor layout changes. Rules are configured through the **Window Rules** utility (Utilities → Window Rules) and are stored locally in `localStorage` under the `window-rules` key.

## Matchers

Every rule can target one or more window attributes:

- **App ID** – matches the launcher identifier from `apps.config.js` (for example `terminal`, `pdfviewer`, or `project-gallery`).
- **Title** – matches the window title using a JavaScript regular expression. Both the pattern and optional flags (`g`, `i`, `m`, …) can be customised. Invalid expressions are ignored so that a broken rule never blocks other matches.
- **Monitor ID** – limits the rule to a specific display. The desktop exposes a virtual `primary` monitor by default and adds an `aux` monitor when a second virtual display is detected. IDs are derived from the browser’s reported screen bounds.

All configured matchers must succeed for a rule to run. Leaving a matcher empty makes it a wildcard for that attribute.

## Actions

Rules can apply the following behaviours. If multiple rules match the same window, later rules in the list override earlier ones for the same action.

- **Tile** – snaps the window to the desktop grid (left tile). Useful for dashboards or chat panes that should always hug the edge of the screen.
- **Float** – clears any snap and restores the window to its free-form position. Use this to opt certain windows out of tiling rules.
- **Always on top** – raises the window above others by default, even when it is not focused.
- **Opacity** – sets a persistent opacity between 10% and 100% while the window is visible. Minimized windows always hide regardless of the configured opacity.

## When rules are evaluated

- immediately after a window opens or is restored from the taskbar
- whenever the window is moved to a different position
- after a monitor resize/change event (for example, when the browser window is resized)

The evaluation order and behaviour mirror the configuration UI so that the previewed actions match what is applied on the desktop.
