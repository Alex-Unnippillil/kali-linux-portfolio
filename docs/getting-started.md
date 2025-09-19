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

## Updating CDN SRI hashes

External scripts that we lazy-load (YouTube IFrame API, Spotify SDK, Math.js, Twitter widgets) have [Subresource Integrity](https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity) hashes checked at runtime. When one of those dependencies ships an update, refresh the hashes with:

```bash
yarn update:sri
```

The command fetches each CDN asset listed in `data/cdn-sri.json`, recalculates the SHA-384 digest, writes the updated integrity strings back to that file, and logs any changes.

## Verifying SRI failures in development

To confirm the browser blocks tampered CDN responses:

1. Run `yarn dev` and open the portfolio in Chrome.
2. Open DevTools → Sources, enable **Overrides**, and pick a local folder for overrides.
3. Visit a screen that loads the target script (for example, `/apps/youtube` for the IFrame API).
4. In the Sources tab, right-click the network script (e.g., `https://www.youtube.com/iframe_api`), choose **Save for overrides**, and edit the file (add a comment or extra character).
5. Refresh the page. The console should show a `Failed to find a valid digest in the 'integrity' attribute` error and the feature will stay in its fallback state.
6. Remove or revert the override once finished so subsequent reloads use the pristine script.
