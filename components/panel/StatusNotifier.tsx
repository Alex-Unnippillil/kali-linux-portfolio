"use client";

import React, { useState } from "react";
import Status from "../util-components/status";

export default function StatusNotifier() {
  const [mounted, setMounted] = useState(true);

  const reload = () => {
    setMounted(false);
    setTimeout(() => setMounted(true), 0);
  };

  return (
    <div className="flex items-center gap-2">
      {mounted && <Status />}
      <button
        type="button"
        onClick={reload}
        className="px-2 py-1 text-ubt-grey hover:text-white hover:bg-ub-grey rounded"
      >
        Reload indicators
      </button>
    </div>
  );
}

