import type { FileSystemDirectoryHandle } from 'wicg-file-system-access';

// This declaration keeps the dependency visible to tooling like depcheck while
// also documenting the reliance on the WICG File System Access specification
// types used across the app's OPFS helpers.
declare global {
  interface DepcheckWicgKeepAlive {
    handle?: FileSystemDirectoryHandle;
  }
}

export {};
