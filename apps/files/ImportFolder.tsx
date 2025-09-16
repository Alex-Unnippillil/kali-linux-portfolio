'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';

type StoredEntry = {
  name: string;
  kind: FileSystemHandle['kind'];
};

interface MountSnapshot {
  directory: string;
  entries: StoredEntry[];
  mountedAt: string;
}

const STORAGE_KEY = 'files:mounted';

const sortEntries = (entries: StoredEntry[]) =>
  entries.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return a.kind === 'directory' ? -1 : 1;
  });

export default function ImportFolder() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function';

  const mountFolder = useCallback(async () => {
    if (!supported || loading) return;

    setError(null);
    setLoading(true);

    try {
      const handle = await window.showDirectoryPicker();
      const entries: StoredEntry[] = [];

      for await (const [name, entry] of handle.entries()) {
        entries.push({ name, kind: entry.kind });
      }

      sortEntries(entries);

      const snapshot: MountSnapshot = {
        directory: handle.name || 'Folder',
        entries,
        mountedAt: new Date().toISOString(),
      };

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (storageError) {
        console.error('Failed to persist mounted folder list', storageError);
        setError('Unable to save the folder listing. Please free up storage and try again.');
        return;
      }

      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, view: 'Mounted' },
        },
        undefined,
        { shallow: true },
      );
    } catch (err) {
      const domError = err as DOMException;
      if (domError?.name === 'AbortError') return;
      console.error('Failed to import folder', err);
      setError('Unable to access that folder. Please check permissions and try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, router, supported]);

  if (!supported) {
    return (
      <div className="h-full bg-ub-cool-grey text-white p-4 space-y-4">
        <h2 className="text-xl font-semibold">Mount a folder</h2>
        <p>
          Your browser does not support the File System Access API. Try Chrome or Edge on
          desktop to mount a folder and explore it in this simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-ub-cool-grey text-white p-4 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Mount a folder</h2>
        <p className="text-sm text-gray-200">
          Choose a local directory. The Files app will snapshot the top-level contents and
          save the list in your browser so you can review it later.
        </p>
      </div>
      <button
        type="button"
        onClick={mountFolder}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? 'Mounting…' : 'Select folder'}
      </button>
      <p className="text-xs text-gray-300">
        We never upload your files. The directory snapshot lives entirely in local storage
        and stays on this device.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
