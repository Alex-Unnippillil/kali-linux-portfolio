"use client";

import React from "react";

export interface Device {
  id: string;
  name: string;
  label?: string;
}

interface SidebarProps {
  devices: readonly Device[];
  onEject?: (id: string) => void;
}

export default function Sidebar({ devices, onEject }: SidebarProps) {
  return (
    <aside className="p-2 w-48 bg-gray-100 rtl:text-right" aria-label="device sidebar">
      <ul>
        {devices.map((device) => (
          <li key={device.id} className="mb-1 flex items-center justify-between">
            <span>{device.label || device.name}</span>
            <div className="flex items-center gap-2">
              {!device.label && (
                <span
                  className="text-xs text-ubt-grey italic"
                  title="Label volumes for easier identification"
                >
                  (Tip: label this volume for easier identification)
                </span>
              )}
              {onEject && (
                <button
                  onClick={() => onEject(device.id)}
                  className="text-xs text-ubt-grey underline"
                  aria-label={`eject-${device.name}`}
                >
                  Eject
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

