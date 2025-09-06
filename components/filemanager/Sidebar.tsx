"use client";

import React from "react";

export interface Device {
  id: string;
  name: string;
  label?: string;
}

interface SidebarProps {
  devices: readonly Device[];
}

export default function Sidebar({ devices }: SidebarProps) {
  return (
    <aside className="p-2 w-48 bg-gray-100" aria-label="device sidebar">
      <ul>
        {devices.map((device) => (
          <li key={device.id} className="mb-1">
            <span>{device.label || device.name}</span>
            {!device.label && (
              <span
                className="ml-2 text-xs text-ubt-grey italic"
                title="Label volumes for easier identification"
              >
                (Tip: label this volume for easier identification)
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}

