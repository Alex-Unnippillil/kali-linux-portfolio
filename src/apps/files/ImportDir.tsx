'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';

export interface ImportDirProps {
  putFile: (entry: {
    path: string[];
    file: File;
    handle: FileSystemFileHandle;
  }) => Promise<unknown> | unknown;
  className?: string;
  children?: ReactNode;
}

function joinPathSegments(parent: string[], name: string) {
  return parent.length ? [...parent, name] : [name];
}

export default function ImportDir({ putFile, className, children }: ImportDirProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function');
  }, []);

  const importEntries = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      parentSegments: string[] = [],
    ): Promise<void> => {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file') {
          try {
            const fileHandle = handle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            await putFile({ path: joinPathSegments(parentSegments, name), file, handle: fileHandle });
          } catch {
            // Ignore failures per file to allow rest of import to continue.
          }
        } else if (handle.kind === 'directory') {
          await importEntries(handle as FileSystemDirectoryHandle, joinPathSegments(parentSegments, name));
        }
      }
    },
    [putFile],
  );

  const handleImport = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      await importEntries(dirHandle);
    } catch (error) {
      // Swallow AbortError when the picker is dismissed.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }, [importEntries]);

  if (!supported) {
    return null;
  }

  return (
    <button type="button" onClick={handleImport} className={className}>
      {children ?? 'Import Directory'}
    </button>
  );
}
