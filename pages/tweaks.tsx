"use client";

import { useState } from "react";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-ubt-blue" : "bg-ubt-grey"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : ""
        }`}
      ></span>
    </button>
  );
}

export default function Tweaks() {
  const [shellZsh, setShellZsh] = useState(false);
  const [mirrorFast, setMirrorFast] = useState(false);
  const [virtTools, setVirtTools] = useState(false);
  const [hardening, setHardening] = useState(false);

  return (
    <main className="p-4 space-y-8">
      <h1 className="text-2xl font-semibold">kali-tweaks</h1>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Shell</h2>
          <Toggle checked={shellZsh} onChange={setShellZsh} />
        </div>
        <p className="text-sm text-ubt-grey">
          Switch between Bash and ZSH as the default shell.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Mirrors</h2>
          <Toggle checked={mirrorFast} onChange={setMirrorFast} />
        </div>
        <p className="text-sm text-ubt-grey">
          Select a fast mirror such as Cloudflare for package updates.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Virtualization</h2>
          <Toggle checked={virtTools} onChange={setVirtTools} />
        </div>
        <p className="text-sm text-ubt-grey">
          Install guest VM tools for smoother virtualization support.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Hardening</h2>
          <Toggle checked={hardening} onChange={setHardening} />
        </div>
        <p className="text-sm text-ubt-grey">
          Apply recommended security hardening tweaks.
        </p>
      </section>
    </main>
  );
}

