import React from "react";

interface Platform {
  icon: string;
  title: string;
  description: string;
  href: string;
}

const platforms: Platform[] = [
  {
    icon: "🦾",
    title: "ARM",
    description: "Optimized builds for ARM hardware.",
    href: "/platforms/arm",
  },
  {
    icon: "🛠️",
    title: "Bare Metal",
    description: "Install directly on physical machines.",
    href: "/platforms/bare-metal",
  },
  {
    icon: "☁️",
    title: "Cloud",
    description: "Deploy Kali Linux in the cloud.",
    href: "/platforms/cloud",
  },
  {
    icon: "📦",
    title: "Containers",
    description: "Run Kali in Docker and other container platforms.",
    href: "/platforms/containers",
  },
  {
    icon: "📱",
    title: "Mobile",
    description: "Take Kali with you on mobile devices.",
    href: "/platforms/mobile",
  },
  {
    icon: "🔌",
    title: "USB",
    description: "Boot from live USB drives anywhere.",
    href: "/platforms/usb-live",
  },
  {
    icon: "💻",
    title: "VMs",
    description: "Use Kali inside virtual machines.",
    href: "/platforms/vmware",
  },
  {
    icon: "🪟",
    title: "WSL",
    description: "Integrate Kali with Windows Subsystem for Linux.",
    href: "/platforms/wsl",
  },
];

export default function KaliEverywhere() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((p) => (
          <div
            key={p.title}
            className="flex flex-col items-center p-4 border rounded text-center bg-white"
          >
            <div className="text-4xl mb-2" aria-hidden>
              {p.icon}
            </div>
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-gray-600">{p.description}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {platforms.map((p) => (
          <li key={p.href}>
            <a
              href={p.href}
              className="inline-block px-3 py-1 rounded-full text-sm bg-[var(--color-accent)] text-[var(--color-inverse)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              {p.title}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

