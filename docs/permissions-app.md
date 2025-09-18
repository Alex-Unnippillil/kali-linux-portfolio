# Permissions App

The Permissions Manager simulates adjusting Unix-style file modes inside the Kali Linux portfolio without touching the real file system.

## Features

- Presents a three-by-three matrix for **user**, **group**, and **other** roles so visitors can toggle read, write, and execute bits with immediate octal and symbolic previews.
- Supports recursive application for directories. The UI automatically disables the option for files to avoid confusion.
- Provides a **dry-run preview** that surfaces all affected paths and any warnings before committing a change.
- Requires a typed confirmation that matches the selected path whenever a potentially destructive change (system file or risky bit flip) is detected.
- Highlights system paths in the results and warning panels so readers understand the simulated impact.

## Implementation notes

- Mock data and the dry-run simulator live in `utils/fileSystemMock.ts`. The helper returns affected paths, warnings, and supports recursive changes so the UI can render accurate previews.
- Component code is located at `components/apps/permissions/index.tsx`. It derives octal and symbolic values from the matrix, renders the confirmation prompt, and routes all operations through the mock simulator.
- Tests reside in `__tests__/components/apps/permissions.test.tsx` and cover the preview math, warning display, and destructive-change confirmation flow.

This app is intentionally self-contained and ships with mock data so it remains safe to showcase in demos and static exports.
