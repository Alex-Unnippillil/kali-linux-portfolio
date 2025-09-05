"use client";

import { useTweaks } from "../../hooks/useTweaks";

export default function Tweaks() {
  const {
    clipboard,
    timeSync,
    sharedFolders,
    setClipboard,
    setTimeSync,
    setSharedFolders,
  } = useTweaks();

  const options = [
    {
      key: "clipboard",
      label: "Shared Clipboard",
      description: "Allows copy and paste between host and virtual machine.",
      checked: clipboard,
      onChange: setClipboard,
    },
    {
      key: "timeSync",
      label: "Sync Host Time",
      description: "Keep the VM clock synchronized with the host system.",
      checked: timeSync,
      onChange: setTimeSync,
    },
    {
      key: "sharedFolders",
      label: "Auto-Mount Shared Folders",
      description: "Mount shared folders from the host at startup.",
      checked: sharedFolders,
      onChange: setSharedFolders,
    },
  ];

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <h1 className="text-2xl font-bold">VM Tweaks</h1>
      {options.map((opt) => (
        <label key={opt.key} className="flex items-start space-x-2">
          <input
            type="checkbox"
            checked={opt.checked}
            onChange={(e) => opt.onChange(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">{opt.label}</span> - {opt.description}
          </span>
        </label>
      ))}
    </div>
  );
}
