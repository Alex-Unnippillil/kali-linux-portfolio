"use client";

import { useState } from "react";
import Currency from "./modules/currency";
import Hash from "./modules/hash";
import Unit from "./modules/unit";

const tabs = [
  { id: "currency", label: "Currency", component: Currency },
  { id: "hash", label: "Hash", component: Hash },
  { id: "unit", label: "Unit", component: Unit },
];

export default function Converter() {
  const [active, setActive] = useState(tabs[0].id);
  const Active = tabs.find((t) => t.id === active)!.component;
  return (
    <div className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto">
      <div className="flex mb-4 border-b border-gray-600">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 ${t.id === active ? "border-b-2 border-white" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}

