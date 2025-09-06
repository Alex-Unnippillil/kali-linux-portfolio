"use client";

import usePersistentState from "./usePersistentState";

const DEFAULT_NAMES = ["Workspace 1", "Workspace 2", "Workspace 3", "Workspace 4"];

export default function useWorkspaceNames() {
  const [names, setNames] = usePersistentState<string[]>(
    "workspace-names",
    DEFAULT_NAMES,
    (v): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string"),
  );
  return { names, setNames } as const;
}
