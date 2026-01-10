"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ToggleSwitch from "../../../components/ToggleSwitch";

const FileExplorer = dynamic(
  () => import("../../../components/apps/file-explorer.js"),
  { ssr: false }
);

export default function RemovableMedia() {
  const [autoOpen, setAutoOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => setShowManager(true), 500);
      return () => clearTimeout(timer);
    }
    setShowManager(false);
  }, [autoOpen]);

  return (
    <div className="w-full flex flex-col flex-grow max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="p-4 flex items-center justify-center">
        <span className="mr-2 text-ubt-grey">Auto-open files on insert</span>
        <ToggleSwitch
          checked={autoOpen}
          onChange={setAutoOpen}
          ariaLabel="Auto-open files on insert"
        />
      </div>
      {showManager && (
        <div className="flex-grow">
          <FileExplorer />
        </div>
      )}
    </div>
  );
}

