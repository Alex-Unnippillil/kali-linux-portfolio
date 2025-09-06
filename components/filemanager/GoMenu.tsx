"use client";

import { useState } from "react";

interface Host {
  name: string;
  shares: string[];
}

const MOCK_HOSTS: Host[] = [
  { name: "workstation-1", shares: ["docs", "media"] },
  { name: "nas", shares: ["public", "backups"] },
];

export default function GoMenu() {
  const [view, setView] = useState<"menu" | "network">("menu");

  const openNetwork = () => setView("network");
  const goBack = () => setView("menu");

  if (view === "network") {
    return (
      <div className="p-2 text-sm">
        <h2 className="font-bold mb-2">Network</h2>
        <ul className="space-y-2">
          {MOCK_HOSTS.map((host) => (
            <li key={host.name}>
              <div className="font-semibold">{host.name}</div>
              <ul className="ml-4 list-disc">
                {host.shares.map((share) => (
                  <li key={share}>{share}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 text-blue-600 underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      <li>Home</li>
      <li>Documents</li>
      <li>Downloads</li>
      <li>
        <button
          type="button"
          onClick={openNetwork}
          className="hover:underline text-left w-full"
        >
          Network
        </button>
      </li>
    </ul>
  );
}

