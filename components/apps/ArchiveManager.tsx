"use client";

import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import ProgressBar from "../ui/ProgressBar";

interface ZipEntry {
  name: string;
  dir: boolean;
}

const ArchiveManager: React.FC = () => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const fh = (window as any).__archiveHandle as FileSystemFileHandle | undefined;
    const dh = (window as any).__archiveDirHandle as
      | FileSystemDirectoryHandle
      | undefined;
    if (fh) {
      loadArchive(fh).catch(() => {});
      setFileHandle(fh);
    }
    if (dh) setDirHandle(dh);
    (window as any).__archiveHandle = undefined;
    (window as any).__archiveDirHandle = undefined;
  }, []);

  const loadArchive = async (fh: FileSystemFileHandle) => {
    try {
      const file = await fh.getFile();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const list = Object.values(zip.files).map(f => ({ name: f.name, dir: f.dir }));
      setEntries(list);
    } catch {
      setEntries([]);
    }
  };

  const addFiles = async () => {
    if (!fileHandle) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      try {
        const file = await fileHandle.getFile();
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        for (const f of Array.from(input.files)) {
          zip.file(f.name, await f.arrayBuffer());
        }
        setProgress(0);
        const content = await zip.generateAsync({ type: "uint8array" }, m => {
          setProgress(m.percent);
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setProgress(null);
        setEntries(Object.values(zip.files).map(f => ({ name: f.name, dir: f.dir })));
      } catch {
        setProgress(null);
      }
    };
    input.click();
  };

  const extractHere = async () => {
    if (!fileHandle || !dirHandle) return;
    try {
      const file = await fileHandle.getFile();
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const files = Object.values(zip.files).filter(f => !f.dir);
      let done = 0;
      setProgress(0);
      for (const z of files) {
        const data = await z.async("uint8array");
        const newHandle = await dirHandle.getFileHandle(z.name, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(data);
        await writable.close();
        done += 1;
        setProgress((done / files.length) * 100);
      }
      setProgress(null);
    } catch {
      setProgress(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm p-2">
      <div className="space-x-2 mb-2">
        <button
          onClick={addFiles}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          Add Files
        </button>
        <button
          onClick={extractHere}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          Extract Here
        </button>
      </div>
      {progress !== null && (
        <div className="mb-2">
          <ProgressBar progress={progress} />
        </div>
      )}
      <ul className="flex-1 overflow-auto border border-gray-600 p-2">
        {entries.map(e => (
          <li key={e.name}>{e.name}</li>
        ))}
      </ul>
    </div>
  );
};

export const displayArchiveManager = () => <ArchiveManager />;

export default ArchiveManager;

