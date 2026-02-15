"use client";

import React, { useState } from "react";

const TEMPLATE_KEY = "xfce.panel.smartbookmark";

export default function SmartBookmark() {
  const [query, setQuery] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !query.trim()) return;

    const template =
      (typeof window !== "undefined" && localStorage.getItem(TEMPLATE_KEY)) ||
      "https://duckduckgo.com/?q=%s";
    const url = template.replace("%s", encodeURIComponent(query.trim()));
    window.open(url, "_blank", "noopener,noreferrer");
    setQuery("");
  };

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      className="bg-ub-cool-grey text-white text-sm px-2 py-0.5 rounded w-32 focus:outline-none"
      placeholder="Search"
      aria-label="Smart bookmark search"
    />
  );
}

