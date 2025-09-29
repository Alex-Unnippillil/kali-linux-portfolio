# NetHunter Car Mode Dashboard

NetHunter now includes a dual-mode console designed for Kali-themed desktop and in-vehicle workflows. Car mode delivers oversized, glanceable controls while automatically adapting to orientation changes so it remains usable on horizontal or vertical mounts.

## Feature summary

- **Shared design tokens** – All NetHunter UI components use the global Kali/Yaru design tokens so colors, radii, spacing, and elevation match the desktop shell.
- **Car mode dashboard** – Large navigation, communication, and tooling tiles surface the most common actions with single-tap execution.
- **Quick action bar** – A persistent strip of toggles (voice control, DND, night mode, auto-record) uses `var(--hit-area)` sizing to maintain accessible tap targets.
- **Auto-rotation awareness** – Layouts automatically switch between portrait and landscape grid densities using the `useOrientation` hook that listens to `screen.orientation` and resize events.
- **Simplified interactions** – Descriptive copy, pronounced icons, and status banners provide continuous feedback without requiring precise pointer input.

## Desktop vs. car workflows

| Mode | Purpose | Highlights |
| --- | --- | --- |
| Desktop | Configure missions before travel | Toolkit overview cards, live status output, and mission planning tips. |
| Car mode | Operate while mounted in-vehicle | Tile-based dashboard with orientation-aware layout and quick toggles. |

## Testing checklist

1. Open **NetHunter** from the applications grid.
2. Switch between **Desktop** and **Car mode** using the toggle in the header.
3. Resize the window (or rotate a tablet) and confirm the car dashboard reflows between portrait and landscape grids.
4. Activate quick toggles and verify the status banner updates with the latest action summary.

## Screenshots

- `public/screenshots/nethunter-car-mode.png` – Car mode dashboard in landscape layout.
- `public/screenshots/nethunter-desktop.png` – Desktop console overview.

Update the screenshots when the UI changes materially.
