"use client";

import React, { useCallback, useState } from "react";
import { LevelPack, parseLevels } from "../../../apps/sokoban/levels";
import { isBrowser } from '@/utils/env';

const STORAGE_KEY = "sokoban_packs";
const FILE_NAME = "sokoban-packs.json";

const opfsSupported = (() => {
  if (!isBrowser()) return false;
  return (
    "storage" in navigator &&
    Boolean((navigator.storage as any).getDirectory)
  );
})();

let directoryHandlePromise: Promise<FileSystemDirectoryHandle | null> | null = null;
const getDirectoryHandle = (): Promise<FileSystemDirectoryHandle | null> => {
  if (directoryHandlePromise) return directoryHandlePromise;
  if (!opfsSupported) {
    directoryHandlePromise = Promise.resolve(null);
  } else {
    directoryHandlePromise = (navigator.storage as any)
      .getDirectory()
      .catch(() => null);
  }
  return directoryHandlePromise;
};

export const loadLocalPacks = async (): Promise<LevelPack[]> => {
  if (!isBrowser()) return [];
  const root = await getDirectoryHandle();
  if (root) {
    try {
      const handle = await root.getFileHandle(FILE_NAME);
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveLocalPacks = async (packs: LevelPack[]): Promise<void> => {
  if (!isBrowser()) return;
  const root = await getDirectoryHandle();
  if (root) {
    try {
      const handle = await root.getFileHandle(FILE_NAME, { create: true });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(packs));
      await writable.close();
      return;
    } catch {
      // fall through to localStorage
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
};

interface LevelImportProps {
  onImport?: (pack: LevelPack) => void;
}

const LevelImport: React.FC<LevelImportProps> = ({ onImport }) => {
  const [text, setText] = useState("");

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const t = await file.text();
        let levels: string[][] = [];
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(t);
          if (Array.isArray(data)) levels = data;
          else if (Array.isArray(data.levels)) levels = data.levels;
        } else {
          levels = parseLevels(t);
        }
        if (!levels.length) return;
        const pack: LevelPack = {
          name: file.name.replace(/\.[^/.]+$/, ""),
          difficulty: "Custom",
          levels,
        };
        const existing = await loadLocalPacks();
        await saveLocalPacks([...existing, pack]);
        onImport?.(pack);
      } catch {
        // ignore parse errors
      } finally {
        e.target.value = "";
      }
    },
    [onImport]
  );

  const handleTextImport = useCallback(async () => {
    try {
      const levels = parseLevels(text);
      if (!levels.length) return;
      const pack: LevelPack = { name: "Custom", difficulty: "Custom", levels };
      const existing = await loadLocalPacks();
      await saveLocalPacks([...existing, pack]);
      onImport?.(pack);
      setText("");
    } catch {
      // ignore parse errors
    }
  }, [text, onImport]);

  return (
    <div className="space-y-2">
      <input type="file" accept=".txt,.json" onChange={handleFile} />
      <textarea
        className="w-full h-24 border"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste level text here"
      />
      <button type="button" onClick={handleTextImport} className="px-2 py-1 bg-gray-300 rounded">
        Import Text
      </button>
    </div>
  );
};

export default LevelImport;

