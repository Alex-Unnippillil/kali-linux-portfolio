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

## Manual QA: Storage recovery

Use this checklist when validating features that persist data via QR history or desktop settings. The goal is to confirm that
quota failures recover without leaving the UI in a broken state.

1. Open the browser DevTools console and execute the snippet below to simulate a quota-exceeded error:

   ```js
   try {
     for (let i = 0; i < 200; i += 1) {
       localStorage.setItem(`quota-fill-${i}`, 'x'.repeat(1024 * 1024));
     }
   } catch (error) {
     console.warn('Simulated quota fill complete', error);
   }
   ```

2. Trigger a write in the QR tool (scan a code or paste data) and adjust a desktop setting such as the density toggle.
3. Confirm the UI falls back to an empty QR history and default settings values instead of crashing or leaving stale data.
4. Check the console for `[qrStorage]` or `[settingsStore]` warnings that note the fallback. These indicate the recovery path ran.
5. Clear `localStorage` (Application tab → Clear storage) before repeating other manual tests.
