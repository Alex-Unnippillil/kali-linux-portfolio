# Design System Notes

## Elevation scale

The desktop shell now exposes a tokenized elevation scale backed by CSS custom properties in `styles/tokens.css` and mapped to Tailwind utilities. Use the semantic classes instead of numeric `z-*` utilities to keep overlapping UI predictable.

| Token | CSS Variable | Tailwind Class | Layer | Typical Usage |
| --- | --- | --- | --- | --- |
| `--elevation-background` | `--elevation-background` | `z-background` | -10 | Wallpaper, decorative backdrops |
| `--elevation-base` | `--elevation-base` | `z-base` | 0 | Default stacking context, lock screen wallpaper |
| `--elevation-surface` | `--elevation-surface` | `z-surface` | 10 | Window contents, floating affordances inside a window |
| `--elevation-window-resting` | `--elevation-window-resting` | `z-window-resting` | 20 | Unfocused windows and draggable shells |
| `--elevation-window-focused` | `--elevation-window-focused` | `z-window-focused` | 30 | Active window frames |
| `--elevation-chrome` | `--elevation-chrome` | `z-chrome` | 40 | Taskbar, global nav, persistent controls like the help toggle |
| `--elevation-popover` | `--elevation-popover` | `z-popover` | 50 | Context menus, trays, dropdowns, transient HUDs |
| `--elevation-overlay` | `--elevation-overlay` | `z-overlay` | 60 | App switcher, modal scrims, shortcut overlays |
| `--elevation-critical` | `--elevation-critical` | `z-critical` | 70 | System lock screen, alerts that must sit on top of everything |

### Implementation notes

- The scale is registered in `tailwind.config.js`, so any component can opt into the semantic layers with Tailwind classes.
- Windows transition between `z-window-resting` and `z-window-focused` when focus changes, keeping the focused frame above siblings while still below chrome and overlays.
- Overlays (switcher, modals, lock screen) use `z-overlay` or `z-critical`, ensuring system surfaces eclipse regular windows without numerical juggling.
- Menus, notifications, and tooltips consume `z-popover` so they sit above the desktop chrome but fall under blocking overlays.

Verifying the hierarchy is as simple as opening overlapping windows, menus, and overlays—the focused window appears above other app frames, the dock and navbar remain above windows, and global overlays cover all underlying content while maintaining internal layering for background imagery and text.
