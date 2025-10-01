export type VirtualEntryKind = 'file' | 'directory';

export interface VirtualEntry {
  name: string;
  path: string;
  kind: VirtualEntryKind;
  size?: number;
  lastModified?: number;
}

export interface ReadFileOptions {
  as?: 'text' | 'uint8array';
}

export interface FileSystemProvider {
  /** Unique id for the provider instance */
  id: string;
  /** Human readable label used in the UI */
  label: string;
  /** Indicates whether the provider allows writes */
  readOnly: boolean;
  /** Return entries for a directory path. */
  list(path: string): Promise<VirtualEntry[]>;
  /**
   * Read a file from the provider. Implementations may ignore the decoding option
   * and always return a string. Consumers should handle both string and Uint8Array
   * results.
   */
  readFile(path: string, options?: ReadFileOptions): Promise<string | Uint8Array | null>;
}

export interface MemoryProvider extends FileSystemProvider {
  writeFile(path: string, data: string | Uint8Array): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface MountableProvider extends FileSystemProvider {
  /**
   * Called when the provider is removed. Allows cleanup of any held resources.
   */
  unmount(): Promise<void> | void;
}

export interface ZipProvider extends MountableProvider {
  sourceName: string;
}
