"use client";

import React, { useState } from "react";

type Preset = {
  id: string;
  label: string;
  template: string;
  placeholder: string;
};

const PRESETS: readonly Preset[] = [
  {
    id: "kali",
    label: "Kali Tools",
    template: "https://www.kali.org/tools/{}",
    placeholder: "Search Kali tools...",
  },
  {
    id: "debian",
    label: "Debian Bugs",
    template: "https://bugs.debian.org/{}",
    placeholder: "Bug number or package",
  },
  {
    id: "arch",
    label: "Arch Wiki",
    template: "https://wiki.archlinux.org/index.php?search={}",
    placeholder: "Search Arch Wiki...",
  },
] as const;

export default function SmartBookmark() {
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [query, setQuery] = useState("");

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const url = activePreset.template.replace(
      "{}",
      encodeURIComponent(query.trim())
    );
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePreset(p)}
            className={`px-2 py-1 rounded text-sm focus:outline-none ${
              activePreset.id === p.id
                ? "bg-ub-orange text-white"
                : "bg-ub-cool-grey text-ubt-grey"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activePreset.placeholder}
          aria-label="Search query"
          className="flex-1 px-2 py-1 bg-ub-cool-grey text-white rounded-l focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-ub-orange text-white rounded-r"
          aria-label="Search"
        >
          Go
        </button>
      </form>
    </div>
  );
}

