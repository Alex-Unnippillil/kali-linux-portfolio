"use client";

import React from "react";
import ReactJson, { InteractionProps } from "react-json-view";

export interface DiffViewerProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  beforeLabel?: string;
  afterLabel?: string;
  collapsed?: boolean;
  className?: string;
  onInspect?: (entry: InteractionProps) => void;
}

const panelBaseClasses =
  "rounded border border-ubt-cool-grey bg-ub-cool-grey/50 backdrop-blur-sm shadow-inner";

const headingClasses = "px-3 py-2 border-b border-ubt-cool-grey text-sm font-semibold";

const viewerClasses = "max-h-80 overflow-auto px-2 py-2 text-xs";

const DiffViewer: React.FC<DiffViewerProps> = ({
  before,
  after,
  beforeLabel = "Current", 
  afterLabel = "Incoming",
  collapsed = false,
  className = "",
  onInspect,
}) => {
  const sharedProps = {
    name: null as const,
    collapsed,
    collapseStringsAfterLength: 32,
    enableClipboard: false,
    displayDataTypes: false,
    displayObjectSize: false,
    theme: "harmonic", 
    iconStyle: "triangle" as const,
    onSelect: onInspect,
    style: {
      background: "transparent",
    },
  };

  return (
    <div
      className={`grid gap-4 md:grid-cols-2 ${className}`}
      role="group"
      aria-label="Settings diff"
    >
      <section className={panelBaseClasses} aria-live="polite">
        <header className={headingClasses}>{beforeLabel}</header>
        <div className={viewerClasses}>
          {before ? (
            <ReactJson src={before} {...sharedProps} />
          ) : (
            <p className="text-ubt-grey text-xs">No baseline available.</p>
          )}
        </div>
      </section>
      <section className={panelBaseClasses} aria-live="polite">
        <header className={headingClasses}>{afterLabel}</header>
        <div className={viewerClasses}>
          {after ? (
            <ReactJson src={after} {...sharedProps} />
          ) : (
            <p className="text-ubt-grey text-xs">No import data loaded.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default DiffViewer;
