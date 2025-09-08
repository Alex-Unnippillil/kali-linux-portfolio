"use client";

import React, { type ReactNode } from "react";
import TopPanel from "./TopPanel";

interface Props {
  /** Title to display in the TopPanel */
  title?: string;
  /** Page content */
  children: ReactNode;
}

/**
 * Simple layout that places a TopPanel above arbitrary content, mimicking a
 * desktop environment. The panel remains at the top while content fills the
 * remaining viewport height.
 */
export default function DesktopLayout({ title, children }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopPanel title={title} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

