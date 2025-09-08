import React from "react";

interface Platform {
  icon: string;
  title: string;
  description: string;
}

const platforms: Platform[] = [
  {
    icon: "🦾",
    title: "ARM",
    description: "Optimized builds for ARM hardware.",
  },
  {
    icon: "🛠️",
    title: "Bare Metal",
    description: "Install directly on physical machines.",
  },
  {
    icon: "☁️",
    title: "Cloud",
    description: "Deploy Kali Linux in the cloud.",
  },
  {
    icon: "📦",
    title: "Containers",
    description: "Run Kali in Docker and other container platforms.",
  },
  {
    icon: "📱",
    title: "Mobile",
    description: "Take Kali with you on mobile devices.",
  },
  {
    icon: "🔌",
    title: "USB",
    description: "Boot from live USB drives anywhere.",
  },
  {
    icon: "💻",
    title: "VMs",
    description: "Use Kali inside virtual machines.",
  },
  {
    icon: "🪟",
    title: "WSL",
    description: "Integrate Kali with Windows Subsystem for Linux.",
  },
];

export default function KaliEverywhere() {
  return (
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
  );
}

