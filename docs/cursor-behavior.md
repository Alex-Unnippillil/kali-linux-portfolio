# Cursor behavior guide

This document summarizes the system cursor states that surface while using the desktop shell. QA can rely on it to verify that drag, drop, and resize flows expose the expected feedback.

## Global states

The desktop applies a global CSS class on the `<body>` element that maps to the cursor values below. All states fall back to the default cursor when the interaction completes or is cancelled.

| State | CSS class | Cursor value | Trigger(s) |
| ----- | --------- | ------------ | ---------- |
| Default | `cursor-default` | `default` | Baseline desktop interaction. |
| Move | `cursor-move` | `move` | Dragging a window by its title bar, reordering tabs, or other draggable UI that supports repositioning. |
| Copy | `cursor-copy` | `copy` | Dragging application launchers or other items that duplicate data on drop. |
| Busy | `cursor-busy` | `progress, wait` | Resizing a window or any long-running drag action that locks layout updates. |
| Not allowed | `cursor-not-allowed` | `not-allowed` | Attempting to drag disabled shortcuts or drop onto a forbidden target. |

The update is throttled with `requestAnimationFrame` (and a 48&nbsp;ms fallback) to guarantee that cursor changes render within 50&nbsp;ms of the state change.

## QA checklist

1. **Window drag** – grab any window title bar, move it a few pixels, and confirm the cursor switches to `move` immediately. Release to ensure the cursor snaps back to `default`.
2. **Window resize** – drag a horizontal or vertical resize handle. The cursor should flip to the busy spinner during the drag and reset on release.
3. **Launcher drag** – drag a desktop shortcut. The cursor should show the copy indicator while the icon is in flight.
4. **Disabled shortcut** – create or load a disabled shortcut (for example a folder created through the desktop file picker). Starting a drag should show the `not-allowed` cursor briefly before returning to the default state.
5. **Tab reorder** – reorder tabs inside tabbed windows. The move cursor should appear while dragging and disappear on drop.

Document any deviations from the table above when filing issues so engineering can reproduce the exact interaction path.
