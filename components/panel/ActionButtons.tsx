"use client";

import { useEffect, useState } from "react";
import useSession from "../../hooks/useSession";
import { safeLocalStorage } from "../../utils/safeStorage";

const PLUGIN_PREFIX = "xfce.panel.plugin.";

export default function ActionButtons() {
  const { resetSession } = useSession();
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(`${PLUGIN_PREFIX}actionButtons`);
    setOrder(stored ? parseInt(stored, 10) : 0);
  }, []);

  const lockScreen = () => {
    safeLocalStorage?.setItem("screen-locked", "true");
    window.location.reload();
  };

  const logOut = () => {
    resetSession();
    safeLocalStorage?.setItem("screen-locked", "true");
    window.location.reload();
  };

  const restart = () => {
    resetSession();
    window.location.reload();
  };

  const disabledClasses =
    "px-4 py-1 rounded bg-ubt-grey text-white text-sm opacity-50 cursor-not-allowed";
  const activeClasses =
    "px-4 py-1 rounded bg-ubt-blue text-white text-sm hover:bg-ubt-blue/80";

  return (
    <div className="flex flex-col space-y-2" style={{ order }}>
      <button type="button" onClick={lockScreen} className={activeClasses}>
        Lock Screen
      </button>
      <button
        type="button"
        disabled
        title="Multiple users are not supported"
        className={disabledClasses}
      >
        Switch User
      </button>
      <button type="button" onClick={logOut} className={activeClasses}>
        Log Out
      </button>
      <button type="button" onClick={restart} className={activeClasses}>
        Restart
      </button>
      <button
        type="button"
        disabled
        title="Shutdown is not available"
        className={disabledClasses}
      >
        Shut Down
      </button>
    </div>
  );
}

