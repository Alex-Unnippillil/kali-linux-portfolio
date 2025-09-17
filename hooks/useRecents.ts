"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RECENTS_EVENT,
  RECENTS_STORAGE_KEY,
  RecentItem,
  clearRecents,
  getRecents,
  removeRecent,
} from "../utils/recentsStore";

export interface UseRecentsResult {
  items: RecentItem[];
  remove: (id: string) => void;
  clear: () => void;
  refresh: () => void;
}

const useRecents = (): UseRecentsResult => {
  const [items, setItems] = useState<RecentItem[]>(() => getRecents());

  const refresh = useCallback(() => {
    setItems(getRecents());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChange = () => refresh();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === RECENTS_STORAGE_KEY) {
        refresh();
      }
    };

    window.addEventListener(RECENTS_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(RECENTS_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    removeRecent(id);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    clearRecents();
  }, []);

  return { items, remove, clear, refresh };
};

export default useRecents;

