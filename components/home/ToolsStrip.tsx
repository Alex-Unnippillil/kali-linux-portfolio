import React from "react";
import tools from "../../data/tools.json";

interface Tool {
  name: string;
}

export default function ToolsStrip() {
  const toolNames = (tools as Tool[]).map((t) => t.name);

  return (
    <div className="flex overflow-x-auto gap-2 py-2">
      {toolNames.map((name) => (
        <div
          key={name}
          className="flex-shrink-0 whitespace-nowrap rounded border px-2 py-1 text-sm outline outline-2 outline-offset-2 outline-transparent hover:outline-blue-500"
        >
          {name}
        </div>
      ))}
    </div>
  );
}
