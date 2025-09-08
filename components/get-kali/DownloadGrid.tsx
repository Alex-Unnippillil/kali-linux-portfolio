import React from "react";

interface DownloadCategory {
  title: string;
  icon: string;
  description: string;
  href: string;
}

const categories: DownloadCategory[] = [
  {
    title: "Installer",
    icon: "💿",
    description: "Full offline installation image.",
    href: "#installer",
  },
  {
    title: "VMs",
    icon: "💻",
    description: "Prebuilt virtual machine images.",
    href: "#vms",
  },
  {
    title: "ARM",
    icon: "🦾",
    description: "Optimized images for ARM devices.",
    href: "#arm",
  },
  {
    title: "Mobile",
    icon: "📱",
    description: "Kali Linux on mobile platforms.",
    href: "#mobile",
  },
  {
    title: "Cloud",
    icon: "☁️",
    description: "Images for cloud providers.",
    href: "#cloud",
  },
  {
    title: "Containers",
    icon: "📦",
    description: "Run Kali in containers.",
    href: "#containers",
  },
  {
    title: "Live",
    icon: "🔌",
    description: "Bootable live environments.",
    href: "#live",
  },
  {
    title: "WSL",
    icon: "🪟",
    description: "Windows Subsystem for Linux packages.",
    href: "#wsl",
  },
];

export default function DownloadGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((c) => (
        <a
          key={c.title}
          href={c.href}
          className="flex flex-col items-center p-4 border rounded text-center bg-white hover:shadow-card focus-visible:ring focus-visible:outline-none"
        >
          <span className="text-4xl mb-2" aria-hidden>
            {c.icon}
          </span>
          <h3 className="font-semibold">{c.title}</h3>
          <p className="text-sm text-gray-600">{c.description}</p>
        </a>
      ))}
    </div>
  );
}

