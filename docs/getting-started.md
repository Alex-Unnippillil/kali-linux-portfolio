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

## First Boot Checklist

- The desktop automatically launches the **First Boot Checklist** app on the first session to walk through hostname, user,
  SSH, updates, and firewall configuration tasks.
- Progress is saved locally so you can close the window and return later. Once all five steps reach 100%, a JSON summary can be
  exported for documentation.
- Set `NEXT_PUBLIC_ENABLE_FIRST_BOOT_CHECKLIST=disabled` to skip the wizard in environments where you manage onboarding
  elsewhere. Offline mode or the "Block network requests" accessibility setting will surface alternate guidance instead of
  attempting to call APIs.
