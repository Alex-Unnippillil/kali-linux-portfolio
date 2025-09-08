"use client";

import React from 'react';
import CommandChip from '../../../components/ui/CommandChip';

const WindowModeDiagram = () => (
  <svg viewBox="0 0 120 80" className="mx-auto mb-4 w-full h-auto max-w-[200px]">
    <rect x="1" y="1" width="118" height="78" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
    <rect x="20" y="15" width="80" height="50" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
    <text x="60" y="45" textAnchor="middle" fill="#fff" fontSize="10">
      Kali Desktop
    </text>
  </svg>
);

const SeamlessModeDiagram = () => (
  <svg viewBox="0 0 120 80" className="mx-auto mb-4 w-full h-auto max-w-[200px]">
    <rect x="1" y="1" width="118" height="78" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
    <rect x="10" y="10" width="40" height="30" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
    <rect x="70" y="40" width="40" height="30" fill="#1f2937" stroke="#9ca3af" strokeWidth="2" />
    <text x="30" y="28" textAnchor="middle" fill="#fff" fontSize="8">
      Kali App
    </text>
    <text x="90" y="58" textAnchor="middle" fill="#fff" fontSize="8">
      Kali App
    </text>
  </svg>
);

const EnhancedModeDiagram = () => (
  <svg viewBox="0 0 120 80" className="mx-auto mb-4 w-full h-auto max-w-[200px]">
    <rect x="1" y="1" width="118" height="78" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
    <rect
      x="15"
      y="10"
      width="90"
      height="60"
      fill="#1f2937"
      stroke="#9ca3af"
      strokeWidth="2"
      strokeDasharray="4 2"
    />
    <text x="60" y="45" textAnchor="middle" fill="#fff" fontSize="10">
      RDP Session
    </text>
  </svg>
);

export default function WinKexHelp() {
  return (
    <main className="p-4 prose prose-invert max-w-none">
      <h1>Win-KeX Session Modes</h1>
      <p>
        Win-KeX brings the Kali Linux desktop to WSL. Use <kbd>F8</kbd> in any mode to open the
        KeX control menu and send special key combinations.
      </p>

      <section>
        <h2>Window Mode</h2>
        <WindowModeDiagram />
        <p>
          Runs a full Kali desktop inside a single window. Press <kbd>F8</kbd> to release the
          pointer or toggle the control menu.
        </p>
        <CommandChip command="kex --win" />
      </section>

      <section>
        <h2>Seamless Mode</h2>
        <SeamlessModeDiagram />
        <p>
          Integrates Kali apps directly onto the Windows desktop. Use <kbd>F8</kbd> to bring up the
          menu for moving or resizing windows.
        </p>
        <CommandChip command="kex --sl" />
      </section>

      <section>
        <h2>Enhanced Session Mode</h2>
        <EnhancedModeDiagram />
        <p>
          Uses an RDP connection for features like clipboard and sound. Tap <kbd>F8</kbd> to access
          session options or send <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Del</kbd>.
        </p>
        <CommandChip command="kex --esm" />
      </section>
    </main>
  );
}

