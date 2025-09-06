"use client";

import usePersistentState from "./usePersistentState";

export default function useDoNotDisturb() {
  const [dnd, setDnd] = usePersistentState<boolean>(
    "do-not-disturb",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  return { dnd, setDnd } as const;
}
