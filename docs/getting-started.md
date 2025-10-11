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

## Project Gallery data source

The Project Gallery app reads its catalog from [`data/projects.json`](../data/projects.json). Each entry includes:

- `id` – numeric identifier used for comparisons and key generation.
- `title` and `description` – plain text strings surfaced in cards and comparison summaries.
- `stack` – array of technologies shown as filter chips.
- `tags` – highlight keywords used for tag filters.
- `year` – numeric year used for timeline filtering.
- `type` – category label (e.g., `web`, `service`).
- `thumbnail` – path to an image rendered in the card preview.
- `repo` (optional) – URL for the repository call-to-action.
- `demo` (optional) – URL for the live demo call-to-action.
- `snippet` and `language` (optional) – code sample rendered inside the Monaco editor when present.

Adding or updating entries in this JSON file automatically updates both the desktop widget (`components/apps/project-gallery.tsx`) and the standalone page app (`apps/project-gallery/pages/index.tsx`). Keep URLs HTTPS and provide at least one of `repo` or `demo` so every card exposes an accessible call-to-action.
