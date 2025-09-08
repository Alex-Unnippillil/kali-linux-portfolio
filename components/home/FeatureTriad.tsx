import React from "react";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: "🕵️", // detective emoji
    title: "Undercover",
    description: "Blend into a crowd with a Windows-like look.",
  },
  {
    icon: "🪟", // window emoji
    title: "Win-KeX",
    description: "Run a full Kali desktop experience inside WSL.",
  },
  {
    icon: "🌍", // globe showing Europe-Africa
    title: "Kali Everywhere",
    description: "Take Kali to ARM, cloud, mobile and more.",
  },
];

export default function FeatureTriad() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {features.map((f) => (
        <div
          key={f.title}
          className="flex flex-col items-center p-4 border rounded text-center"
        >
          <div className="mb-2 text-3xl" aria-hidden>
            {f.icon}
          </div>
          <h3 className="font-semibold">{f.title}</h3>
          <p className="text-sm text-gray-600">{f.description}</p>
        </div>
      ))}
    </div>
  );
}
