import React, { useState } from "react";

export interface MenuItem {
  label: string;
  href: string;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
}

export default function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(!open)}
        className="px-3 py-2 text-white hover:bg-ubt-blue focus:outline-none"
      >
        {label}
      </button>
      {open && (
        <ul className="absolute left-0 mt-1 bg-ub-cool-grey text-white shadow-lg min-w-[10rem]">
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="block px-4 py-2 hover:bg-ubt-blue"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
