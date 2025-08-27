# Desktop Builds

This project includes minimal wrappers to run the PWA as a desktop application using either [Electron](https://www.electronjs.org/) or [Tauri](https://tauri.app/).

## Prerequisites

Ensure the build tooling is installed:

```sh
yarn add -D electron electron-builder @tauri-apps/cli
```

Tauri additionally requires the Rust toolchain and platform-specific dependencies. Follow the [Tauri prerequisites guide](https://tauri.app/v1/guides/getting-started/prerequisites) for setup instructions.

## Electron

The Electron wrapper lives in `electron/main.js` and simply loads the hosted PWA.
To generate a desktop build:

```sh
yarn build:electron
```

The compiled application will be written to the `dist/` directory.

## Tauri

Tauri sources are located in the `src-tauri` directory. The configuration opens the same PWA in a native window.
Build native bundles with:

```sh
yarn build:tauri
```

Ensure all Tauri prerequisites are installed before running the build.

