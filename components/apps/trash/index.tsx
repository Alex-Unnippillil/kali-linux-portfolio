"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listTrash,
  restoreItem,
  deleteForever,
  TrashItem,
} from "../../../utils/trash";

const formatAge = (deletedAt: number): string => {
  const diff = Date.now() - deletedAt;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  return "Just now";
};

export default function Trash() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setItems(await listTrash());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const restore = useCallback(async () => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.name}?`)) return;
    await restoreItem(item);
    setSelected(null);
    refresh();
  }, [selected, items, refresh]);

  const remove = useCallback(async () => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Delete ${item.name}?`)) return;
    await deleteForever(item);
    setSelected(null);
    refresh();
  }, [selected, items, refresh]);

  const empty = async () => {
    if (items.length === 0) return;
    if (!window.confirm("Empty trash?")) return;
    await Promise.all(items.map((i) => deleteForever(i)));
    setSelected(null);
    refresh();
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (selected === null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Enter" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        restore();
      }
    },
    [selected, remove, restore]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex">
          <button
            onClick={restore}
            disabled={selected === null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore
          </button>
          <button
            onClick={remove}
            disabled={selected === null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={empty}
            disabled={items.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Empty
          </button>
        </div>
      </div>
      <div className="flex flex-wrap content-start p-2 overflow-auto">
        {items.length === 0 && <div className="w-full text-center mt-10">Trash is empty</div>}
        {items.map((item, idx) => (
          <div
            key={item.id}
            tabIndex={0}
            onClick={() => setSelected(idx)}
            className={`m-2 border p-1 w-32 cursor-pointer ${selected === idx ? "bg-ub-drk-abrgn" : ""}`}
          >
            <p className="text-center text-xs truncate mt-1" title={item.name}>
              {item.name}
            </p>
            <p
              className="text-center text-[10px] text-gray-400"
              aria-label={`Deleted ${formatAge(item.deletedAt)}`}
            >
              {formatAge(item.deletedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
