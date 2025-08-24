'use client';
import React from 'react';

export default function TouchControls() {
  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-4"
      aria-label="touch controls"
    >
      <button className="w-12 h-12 bg-gray-500/50 text-white rounded" aria-label="left">
        ◀
      </button>
      <button className="w-12 h-12 bg-gray-500/50 text-white rounded" aria-label="jump">
        ▲
      </button>
      <button className="w-12 h-12 bg-gray-500/50 text-white rounded" aria-label="right">
        ▶
      </button>
    </div>
  );
}
