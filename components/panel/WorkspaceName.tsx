"use client";

import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";

const WORKSPACE_NAME_KEY = "workspace-name";
const WORKSPACE_EVENT = "workspace-change";

export default function WorkspaceName() {
  const { showWorkspaceName } = useSettings();
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(WORKSPACE_NAME_KEY) || "";
  });

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setName(detail);
        try {
          window.localStorage.setItem(WORKSPACE_NAME_KEY, detail);
        } catch {
          // ignore write errors
        }
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === WORKSPACE_NAME_KEY && e.newValue) {
        setName(e.newValue);
      }
    };
    window.addEventListener(WORKSPACE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!showWorkspaceName || !name) return null;

  return (
    <span className="px-2 text-white text-sm" aria-label="workspace-name">
      {name}
    </span>
  );
}
