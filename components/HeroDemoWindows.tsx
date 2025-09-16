"use client";

import Draggable from "react-draggable";
import { useSettings } from "../hooks/useSettings";

export default function HeroDemoWindows() {
  const { heroDemos } = useSettings();
  if (!heroDemos) return null;
  return (
    <div className="fixed top-4 left-4 space-y-4 pointer-events-none z-50">
      <Draggable handle=".drag-handle">
        <div className="pointer-events-auto w-64 bg-ub-cool-grey text-white rounded shadow-lg select-text">
          <div className="drag-handle bg-ub-window-title px-2 py-1 cursor-move rounded-t select-none">
            Demo Terminal
          </div>
          <pre className="p-2 text-xs">
$ echo "Kali rules"
Kali rules
          </pre>
        </div>
      </Draggable>
      <Draggable handle=".drag-handle">
        <div className="pointer-events-auto w-60 bg-ub-cool-grey text-white rounded shadow-lg select-text">
          <div className="drag-handle bg-ub-window-title px-2 py-1 cursor-move rounded-t select-none">
            Welcome
          </div>
          <div className="p-2 text-sm">
            Drag these windows around. Text inside can be selected.
          </div>
        </div>
      </Draggable>
    </div>
  );
}
