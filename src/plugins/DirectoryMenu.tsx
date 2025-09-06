'use client';

import React, { useEffect, useState } from 'react';

interface DirectoryMenuProps {
  /** Path to show within the menu */
  path: string;
  /** Whether hidden files should be included */
  showHidden?: boolean;
  /** Whether file type icons should be shown */
  showIcons?: boolean;
}

interface Entry {
  name: string;
  icon?: string;
}

/**
 * DirectoryMenu renders a simple list of files for a given path with
 * optional toggles for hidden files and icons. An "Open in Thunar"
 * button is provided for launching the native file manager.
 */
const DirectoryMenu: React.FC<DirectoryMenuProps> = ({
  path,
  showHidden = false,
  showIcons = true,
}) => {
  const [includeHidden, setIncludeHidden] = useState(showHidden);
  const [includeIcons, setIncludeIcons] = useState(showIcons);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    // Attempt to fetch directory listing from an API route. Errors are ignored
    // so the component still renders even if the route is missing.
    fetch(`/api/files?path=${encodeURIComponent(path)}&hidden=${includeHidden}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEntries(data);
        } else if (Array.isArray(data?.files)) {
          setEntries(data.files);
        } else {
          setEntries([]);
        }
      })
      .catch(() => setEntries([]));
  }, [path, includeHidden]);

  const openInThunar = () => {
    const encoded = encodeURIComponent(path);
    // Using a custom scheme so systems with Thunar installed can handle it
    window.open(`thunar://${encoded}`);
  };

  return (
    <div className="relative" role="menu">
      <ul className="bg-ub-cool-grey rounded p-2 text-white">
        {entries.map((e) => (
          <li key={e.name} className="flex items-center">
            {includeIcons && e.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.icon} alt="" className="w-4 h-4 mr-1" />
            )}
            {e.name}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-gray-400">No files</li>
        )}
      </ul>
      <div className="mt-2 flex flex-col text-xs text-white">
        <label className="flex items-center mb-1">
          <input
            type="checkbox"
            className="mr-1"
            checked={includeHidden}
            onChange={() => setIncludeHidden((v) => !v)}
          />
          Show hidden files
        </label>
        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            className="mr-1"
            checked={includeIcons}
            onChange={() => setIncludeIcons((v) => !v)}
          />
          Show icons
        </label>
        <button
          type="button"
          onClick={openInThunar}
          className="bg-ub-orange text-black rounded px-2 py-1"
        >
          Open in Thunar
        </button>
      </div>
    </div>
  );
};

export default DirectoryMenu;

