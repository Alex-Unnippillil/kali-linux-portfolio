"use client";

import { useCallback, useEffect, useRef } from 'react';
import { createStore, get, set, del, keys } from 'idb-keyval';
import useOPFS from '../../../../../hooks/useOPFS';
import {
  encodeCacheValue,
  decodeCacheValue,
  type CachePayload,
} from '../../../../../utils/cacheCompression';

export interface SaveSlot {
  name: string;
  data: unknown;
}

const getStore = (gameId: string) => createStore(`game:${gameId}`, 'saves');

export default function useGameSaves(gameId: string) {
  const { supported, getDir, readFile, writeFile, deleteFile } = useOPFS();
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    if (!supported) return;
    getDir(`games/${gameId}`).then((d) => {
      if (d) dirRef.current = d;
    });
  }, [supported, gameId, getDir]);

  const saveSlot = useCallback(
    async (slot: SaveSlot) => {
      const dir = dirRef.current;
      if (supported && dir) {
        await writeFile(`${slot.name}.json`, JSON.stringify(slot.data), dir);
      } else {
        const store = getStore(gameId);
        await set(slot.name, await encodeCacheValue(slot.data), store);
      }
    },
    [supported, gameId, writeFile],
  );

  const loadSlot = useCallback(
    async <T = unknown>(name: string): Promise<T | undefined> => {
      const dir = dirRef.current;
      if (supported && dir) {
        const txt = await readFile(`${name}.json`, dir);
        return txt ? (JSON.parse(txt) as T) : undefined;
      }
      const store = getStore(gameId);
      const raw = await get<CachePayload<T>>(name, store);
      const decoded = await decodeCacheValue<T>(raw);
      return decoded ?? undefined;
    },
    [supported, gameId, readFile],
  );

  const deleteSlot = useCallback(
    async (name: string) => {
      const dir = dirRef.current;
      if (supported && dir) {
        await deleteFile(`${name}.json`, dir);
      } else {
        const store = getStore(gameId);
        await del(name, store);
      }
    },
    [supported, gameId, deleteFile],
  );

  const listSlots = useCallback(
    async (): Promise<string[]> => {
      const dir = dirRef.current;
      if (supported) {
        if (!dir) return [];
        const names: string[] = [];
        for await (const [name, handle] of (dir as any).entries()) {
          if (handle.kind === 'file' && name.endsWith('.json')) {
            names.push(name.replace(/\.json$/, ''));
          }
        }
        return names;
      }
      const store = getStore(gameId);
      const allKeys = await keys(store);
      return allKeys as string[];
    },
    [supported, gameId],
  );

  const exportSaves = useCallback(
    async (): Promise<SaveSlot[]> => {
      const dir = dirRef.current;
      if (supported) {
        if (!dir) return [];
        const slots: SaveSlot[] = [];
        for await (const [name, handle] of (dir as any).entries()) {
          if (handle.kind === 'file' && name.endsWith('.json')) {
            const txt = await readFile(name, dir);
            if (txt) slots.push({ name: name.replace(/\.json$/, ''), data: JSON.parse(txt) });
          }
        }
        return slots;
      }
      const store = getStore(gameId);
      const allKeys = await keys(store);
      const saves: SaveSlot[] = [];
      for (const key of allKeys) {
        const raw = await get<CachePayload<unknown>>(key, store);
        const data = await decodeCacheValue(raw);
        saves.push({ name: key as string, data });
      }
      return saves;
    },
    [supported, gameId, readFile],
  );

  const importSaves = useCallback(
    async (saves: SaveSlot[]): Promise<void> => {
      const dir = dirRef.current;
      if (supported && dir) {
        await Promise.all(
          saves.map((slot) =>
            writeFile(`${slot.name}.json`, JSON.stringify(slot.data), dir),
          ),
        );
      } else {
        const store = getStore(gameId);
        await Promise.all(
          saves.map(async (slot) =>
            set(slot.name, await encodeCacheValue(slot.data), store),
          ),
        );
      }
    },
    [supported, gameId, writeFile],
  );

  return { saveSlot, loadSlot, deleteSlot, listSlots, exportSaves, importSaves };
}

