import React from "react";

export type SeparatorStyle = "transparent" | "line" | "handle" | "dots";

interface SeparatorProps {
  style?: SeparatorStyle;
  expand?: boolean;
}

export default function Separator({ style = "transparent", expand = false }: SeparatorProps) {
  const grow = expand ? "flex-grow" : "";

  switch (style) {
    case "line":
      return <div className={`mx-1 w-px h-6 bg-gray-600 ${grow}`} />;
    case "handle":
      return (
        <div className={`flex items-center mx-1 ${grow}`}>
          <div className="w-0.5 h-4 bg-gray-500 rounded-sm" />
          <div className="w-0.5 h-4 bg-gray-500 rounded-sm ml-0.5" />
        </div>
      );
    case "dots":
      return (
        <div className={`flex items-center mx-1 space-x-0.5 ${grow}`}>
          <span className="w-1 h-1 bg-gray-500 rounded-full" />
          <span className="w-1 h-1 bg-gray-500 rounded-full" />
          <span className="w-1 h-1 bg-gray-500 rounded-full" />
        </div>
      );
    case "transparent":
    default:
      return <div className={`mx-1 ${grow}`} />;
  }
}

