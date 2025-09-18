# Getting Started

This project is built with [Next.js](https://nextjs.org/).

## Prerequisites

- Node.js 20
- yarn or npm

## Installation

```bash
yarn install
```

## Running in Development

```bash
yarn dev
```

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).

## Personalization

The desktop shell exposes personalization controls through the Settings app:

- **Themes** toggle the global token set applied to `html[data-theme]`. Unlockable themes are persisted in `localStorage` via `utils/theme.ts` and switch background, text, and surface tokens.
- **Accent colors** update the design tokens managed in `hooks/useSettings.tsx`. Palette selections or a custom color picker feed the accent value into `--color-accent`, `--color-control-accent`, and `--color-on-accent`. The contrast helper blocks colors below a 4.7:1 ratio (WCAG AA with extra margin) so focus rings, buttons, and window chrome stay legible across wallpapers.
- **Wallpapers** remain independent of the accent system. The preview frame in Settings shows the selected wallpaper so contributors can confirm the accent still reads over the background.

All personalization choices persist through IndexedDB (`accent`, wallpaper) and `localStorage` (density, reduced motion, theme). Clearing preferences from the reset action wipes those stores and restores the default accent/theme pairing.
