# Context Menu Guidelines

This document tracks the desktop apps that expose custom context menus and
records the ordering rules used by `components/common/ContextMenu.tsx`.

## Ordering principles

- **Primary actions first.** The first six actionable rows contain the most
  common commands. Secondary or destructive actions are separated into labeled
  sections that render after the initial block.
- **Use labeled separators.** Group related commands with
  `type: 'separator'` entries so the menu reads as short sections instead of one
  long list.
- **Keep actions keyboard accessible.** Context menus automatically support
  roving tab index and `Shift+F10`. Use the `onOpen` hook to update selection
  state when the menu is triggered with the keyboard or mouse.
- **Disable instead of hiding.** When an action cannot run (no selection, no
  data), leave it visible and mark it `disabled` so the user understands why the
  option is unavailable.

## App inventory

| App | File | Primary actions (first block) | Secondary sections |
| --- | --- | --- | --- |
| Project Gallery | `components/apps/project-gallery/ContextMenu.tsx` | Open repo, copy repo URL, open/copy demo (if available), toggle comparison | Filter helpers (filter by stack, add tags), Project tools (reset filters, clear comparison) |
| QR Scanner | `components/apps/qr/ContextMenu.tsx` | Copy result, download preview, clear result | Camera controls (switch camera, toggle flashlight) |
| QR Tool | `components/apps/qr_tool/ContextMenu.tsx` | Copy text, download PNG/SVG, toggle invert, reset form, generate batch | Batch management (clear generated batch) |
| Trash | `components/apps/trash/ContextMenu.tsx` | Restore item, delete item | Bulk actions (restore all, empty trash) |

Use the table above when adding new actions so future updates keep the layout
consistent across apps.
