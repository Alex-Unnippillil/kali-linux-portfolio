"use client";

import React, { useState } from "react";
import Status from "../util-components/status";

export default function StatusNotifier() {
  const [key, setKey] = useState(0);

  const reload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKey((k) => k + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <Status key={key} />
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
