'use client';

import { useState } from 'react';

type StorageManagerWithDirectory = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

const CONFIRM_MESSAGE =
  'Clear cached assets and offline files for this desktop? This will reset offline progress.';

async function clearCacheStorage(): Promise<void> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') {
    return;
  }
  const cacheNames = await caches.keys();
  if (!cacheNames.length) return;
  const results = await Promise.all(cacheNames.map((name) => caches.delete(name)));
  const failed = results.some((result) => !result);
  if (failed) {
    throw new Error('Failed to delete one or more Cache API entries.');
  }
}

async function removeEntry(
  directory: FileSystemDirectoryHandle,
  name: string,
  recursive?: boolean,
): Promise<void> {
  try {
    if (recursive) {
      await directory.removeEntry(name, { recursive: true });
    } else {
      await directory.removeEntry(name);
    }
  } catch (error) {
    if (!recursive) {
      try {
        await directory.removeEntry(name, { recursive: true });
        return;
      } catch (innerError) {
        console.warn('Unable to remove OPFS entry with recursive=false.', name, innerError);
        throw innerError;
      }
    }
    console.warn('Unable to remove OPFS entry.', name, error);
    throw error;
  }
}

async function clearOpfsStorage(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const storage = navigator.storage as StorageManagerWithDirectory | undefined;
  if (!storage?.getDirectory) return;

  const root = await storage.getDirectory();
  const directory = root as FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    keys?: () => AsyncIterableIterator<string>;
  };

  const errors: unknown[] = [];

  if (typeof directory.entries === 'function') {
    for await (const [name, handle] of directory.entries() as AsyncIterableIterator<
      [string, FileSystemHandle]
    >) {
      try {
        await removeEntry(root, name, handle.kind === 'directory');
      } catch (error) {
        errors.push(error);
      }
    }
  } else if (typeof directory.keys === 'function') {
    for await (const name of directory.keys() as AsyncIterableIterator<string>) {
      try {
        await removeEntry(root, name, true);
      } catch (error) {
        errors.push(error);
      }
    }
  }

  if (errors.length) {
    throw new Error('Failed to clear some OPFS entries.');
  }
}

export default function ResetButton() {
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (clearing) return;
    if (!window.confirm(CONFIRM_MESSAGE)) return;

    setClearing(true);
    setError(null);

    try {
      await Promise.all([clearCacheStorage(), clearOpfsStorage()]);
      window.location.reload();
    } catch (err) {
      console.error('Storage reset failed', err);
      setError('Unable to clear storage. Please try again.');
      setClearing(false);
    }
  };

  return (
    <div className="space-y-2 text-ubt-grey">
      <p className="text-sm">
        Remove cached assets and offline files saved for this environment.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleReset}
        disabled={clearing}
        className="px-4 py-2 rounded bg-ub-cool-grey border border-ubt-cool-grey hover:bg-ubt-cool-grey disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {clearing ? 'Clearing...' : 'Reset storage'}
      </button>
    </div>
  );
}
