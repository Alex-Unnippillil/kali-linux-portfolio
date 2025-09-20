"use client";

import { useEffect, useMemo, useState } from "react";

type PersistenceState = "loading" | "unsupported" | "prompt" | "granted";

const getStorageManager = (): StorageManager | null => {
  if (typeof navigator === "undefined") return null;

  return navigator.storage ?? null;
};

const hasPersistenceAPIs = (storage: StorageManager | null): storage is StorageManager & {
  persisted: StorageManager["persisted"];
  persist: StorageManager["persist"];
} => Boolean(storage?.persisted && storage.persist);

export default function PersistenceToggle() {
  const [state, setState] = useState<PersistenceState>("loading");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const storage = getStorageManager();

    if (!hasPersistenceAPIs(storage)) {
      if (!cancelled) setState("unsupported");
      return () => {
        cancelled = true;
      };
    }

    storage
      .persisted()
      .then((persisted) => {
        if (!cancelled) setState(persisted ? "granted" : "prompt");
      })
      .catch(() => {
        if (!cancelled) setState("prompt");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequest = async () => {
    const storage = getStorageManager();
    if (!hasPersistenceAPIs(storage) || state !== "prompt" || requesting) return;

    setRequesting(true);
    setError(null);

    try {
      const granted = await storage.persist();
      setState(granted ? "granted" : "prompt");
      if (!granted) setError("Browser denied persistent storage.");
    } catch (err) {
      setError("Unable to request persistent storage.");
    } finally {
      setRequesting(false);
    }
  };

  const buttonLabel = useMemo(() => {
    if (state === "loading") return "Checking persistent storage...";
    if (state === "granted") return "Persistent storage enabled";
    if (requesting) return "Requesting persistent storage...";

    return "Enable persistent storage";
  }, [state, requesting]);

  if (state === "unsupported") {
    return (
      <div className="px-4 mt-4 text-sm text-ubt-grey">
        Persistent storage isn&apos;t supported in this browser.
      </div>
    );
  }

  return (
    <div className="px-4 mt-4">
      <button
        type="button"
        onClick={handleRequest}
        disabled={state !== "prompt" || requesting}
        className="px-4 py-2 rounded bg-ub-orange text-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>
      {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
}
