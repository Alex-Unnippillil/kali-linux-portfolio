import React from "react";

interface PlatformLink {
  label: string;
  slug: string;
}

const platforms: PlatformLink[] = [
  { label: "ARM", slug: "arm" },
  { label: "Bare Metal", slug: "installer" },
  { label: "Cloud", slug: "cloud" },
  { label: "Containers", slug: "containers" },
  { label: "Mobile", slug: "mobile" },
  { label: "USB", slug: "live" },
  { label: "VMs", slug: "virtual-machines" },
  { label: "WSL", slug: "wsl" },
];

export default function PlatformLinks() {
  return (
    <ul className="flex flex-wrap justify-center gap-4 text-sm sm:text-base md:text-lg">
      {platforms.map((p) => (
        <li key={p.slug}>
          <a
            href={`/get-kali#kali-${p.slug}`}
            className="text-blue-500 hover:underline"
          >
            {p.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

