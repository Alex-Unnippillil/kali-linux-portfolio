import React from "react";
import { policies } from "../../data/policies";

const PolicyIndex: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    {policies.map((p) => (
      <div key={p.href} className="space-y-1">
        <a
          href={p.href}
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {p.label}
        </a>
        <p className="text-xs text-gray-500">
          Last updated: {p.updated} · Author: {p.author}
        </p>
      </div>
    ))}
  </div>
);

export default PolicyIndex;
