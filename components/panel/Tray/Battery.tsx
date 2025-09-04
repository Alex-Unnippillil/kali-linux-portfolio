"use client";

import { useState, useRef, useEffect } from "react";

const Battery = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Battery"
        className="px-2 py-1"
        onClick={() => setOpen((o) => !o)}
      >
        <span role="img" aria-hidden="true">
          🔋
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 rounded bg-ub-cool-grey p-2 text-xs shadow">
          Battery status
        </div>
      )}
    </div>
  );
};

export default Battery;

