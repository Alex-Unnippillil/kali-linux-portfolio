"use client";

import React from "react";
import { useSettings } from "../../hooks/useSettings";

export interface StatusNotifierItem {
  id: string;
  /** Default colored icon */
  icon: React.ReactNode;
  /** Optional symbolic monochrome variant */
  symbolic?: React.ReactNode;
}

interface Props {
  items: StatusNotifierItem[];
}

/**
 * Renders SNI icons and applies a monochrome style when symbolic icons
 * are preferred. Icons with a provided `symbolic` glyph will swap to it;
 * otherwise a CSS filter is used to desaturate the colored icon.
 */
export default function StatusNotifier({ items }: Props) {
  const { symbolicIcons } = useSettings();

  return (
    <div className="flex items-center space-x-2">
      {items.map((item) => (
        <span
          key={item.id}
          style=
            symbolicIcons && !item.symbolic
              ? { filter: "grayscale(1) brightness(0) invert(1)" }
              : undefined
        >
          {symbolicIcons && item.symbolic ? item.symbolic : item.icon}
        </span>
      ))}
    </div>
  );
}

