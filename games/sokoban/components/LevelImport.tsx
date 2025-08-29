"use client";

import React, { useCallback } from "react";
import { LevelPack, parseLevels } from "../../../apps/sokoban/levels";

const STORAGE_KEY = "sokoban_packs";
const FILE_NAME = "sokoban-packs.json";

const hasOpfs =
  typeof window !== "undefined" &&
  "storage" in navigator &&
  Boolean((navigator.storage as any).getDirectory);

export const loadLocalPacks = async (): Promise<LevelPack[]> => {
  if (typeof window === "undefined") return [];
  if (hasOpfs) {
    try {
      const root = await (navigator.storage as any).getDirectory();
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
  if (typeof window === "undefined") return;
  if (hasOpfs) {
    const root = await (navigator.storage as any).getDirectory();
    const handle = await root.getFileHandle(FILE_NAME, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(packs));
    await writable.close();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
};

interface LevelImportProps {
  onImport?: (pack: LevelPack) => void;
}

const LevelImport: React.FC<LevelImportProps> = ({ onImport }) => {
  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let levels: string[][] = [];
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) levels = data;
          else if (Array.isArray(data.levels)) levels = data.levels;
        } else {
          levels = parseLevels(text);
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

  return <input type="file" accept=".txt,.json" onChange={handleFile} />;
};

export default LevelImport;

