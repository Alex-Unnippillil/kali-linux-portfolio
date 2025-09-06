import React from "react";
import Status from "../util-components/status";

export default function LegacyTray() {
  return (
    <div className="flex items-center gap-2">
      <Status mode="legacy" />
    </div>
  );
}
