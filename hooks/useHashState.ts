"use client";
import { useEffect, useState } from "react";

export default function useHashState<T extends string>(
  defaultValue: T,
  allowed: readonly T[] = []
) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && (!allowed.length || (allowed as readonly string[]).includes(hash))) {
        setValue(hash as T);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [allowed]);

  const update = (next: T) => {
    setValue(next);
    window.location.hash = next;
  };

  return [value, update] as const;
}
