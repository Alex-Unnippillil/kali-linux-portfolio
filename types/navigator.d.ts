export {};

declare global {
  interface Navigator {
    /** Indicates if the app is launched in standalone mode (iOS). */
    standalone?: boolean;
  }

  interface StorageManager {
    /**
     * Origin Private File System root access.
     * https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/getDirectory
     */
    getDirectory(): Promise<FileSystemDirectoryHandle>;
  }
}
