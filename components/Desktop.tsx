"use client";

import Image from "next/image";
import { KeyboardEvent } from "react";

interface IconItem {
  id: string;
  label: string;
  icon: string;
}

const icons: IconItem[] = [
  {
    id: "home",
    label: "Home",
    icon: "/themes/Yaru/system/user-home.png",
  },
  {
    id: "trash",
    label: "Trash",
    icon: "/themes/Yaru/system/user-trash-full.png",
  },
];

function openIcon(label: string) {
  // Placeholder for icon action
  console.log(`${label} opened`);
}

function handleKeyDown(label: string) {
  return (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openIcon(label);
    }
  };
}

export default function Desktop() {
  return (
    <ul className="absolute left-0 top-0 m-4 space-y-4">
      {icons.map(({ id, label, icon }) => (
        <li key={id} className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => openIcon(label)}
            onKeyDown={handleKeyDown(label)}
            className="focus:outline-none"
            title={label}
            aria-label={label}
          >
            <Image src={icon} alt={label} width={48} height={48} />
          </button>
          <span className="mt-1 text-xs text-white">{label}</span>
        </li>
      ))}
    </ul>
  );
}
