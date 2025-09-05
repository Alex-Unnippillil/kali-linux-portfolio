'use client';
import React from 'react';

export default function Brasero() {
  return (
    <div className="flex h-full w-full bg-gray-900 text-gray-200">
      <div className="flex w-1/2 flex-col gap-4 p-4">
        <button className="rounded bg-gray-700 px-4 py-2 text-left hover:bg-gray-600">
          Burn ISO
        </button>
        <button className="rounded bg-gray-700 px-4 py-2 text-left hover:bg-gray-600">
          Blank RW
        </button>
        <button
          className="cursor-not-allowed rounded bg-gray-700 px-4 py-2 text-left opacity-50"
          disabled
        >
          Audio CD
        </button>
      </div>
      <aside className="w-1/2 p-4">
        <h2 className="mb-2 text-lg font-semibold">Usage Tips</h2>
        <ul className="list-inside list-disc space-y-2 text-sm">
          <li>Start tasks using the buttons on the left.</li>
          <li>Drag files from your file manager into the window.</li>
          <li>Use right-click to rename or remove items.</li>
        </ul>
      </aside>
    </div>
  );
}
