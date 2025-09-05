"use client";

import { useState } from "react";

const DEFAULT_SYSCTL = `kernel.domainname = localdomain
kernel.hostname = kali
net.ipv4.ip_forward = 0`;

export default function KernelTab() {
  const [input, setInput] = useState(DEFAULT_SYSCTL);
  const [preview, setPreview] = useState<string | null>(null);

  const handleApply = () => {
    setPreview(input);
  };

  if (preview !== null) {
    return (
      <div className="p-4 space-y-4">
        <pre
          aria-label="kernel-preview"
          className="bg-ub-cool-grey text-ubt-grey p-2 rounded overflow-auto"
        >
          {preview}
        </pre>
        <div className="flex justify-center">
          <button
            onClick={() => setPreview(null)}
            className="px-4 py-2 rounded bg-ub-orange text-white"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <textarea
        aria-label="kernel-settings"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full h-64 bg-ub-cool-grey text-ubt-grey p-2 rounded border border-ubt-cool-grey"
      />
      <div className="flex justify-center">
        <button
          onClick={handleApply}
          className="px-4 py-2 rounded bg-ub-orange text-white"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

