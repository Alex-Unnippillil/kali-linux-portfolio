"use client";

import React, { useState, useEffect } from 'react';

const KEY_PREFIX = 'breakout-level:';

/**
 * Level selection overlay for Breakout.
 * Lists saved layouts from localStorage and allows loading them.
 */
export default function BreakoutLevels({ onSelect }) {
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    const arr = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        arr.push(key.slice(KEY_PREFIX.length));
      }
    }
    setLevels(arr);
  }, []);

  const load = (name) => {
    const txt = localStorage.getItem(`${KEY_PREFIX}${name}`);
    if (txt && onSelect) {
      try {
        onSelect(JSON.parse(txt));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white space-y-2">
      <div>Choose Level</div>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="px-2 py-1 bg-gray-700 rounded"
      >
        Default
      </button>
      {levels.map((lvl) => (
        <button
          key={lvl}
          type="button"
          onClick={() => load(lvl)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}

