import React from 'react';

interface ToolHeaderProps {
  name: string;
  version?: string;
  updated?: string;
  badges?: React.ReactNode;
}

export default function ToolHeader({
  name,
  version,
  updated,
  badges,
}: ToolHeaderProps) {
  return (
    <header className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{name}</h1>
        {version && (
          <span className="inline-block rounded bg-info/20 px-2 py-1 text-xs font-semibold text-info">
            v{version}
          </span>
        )}
        {updated && (
          <span className="inline-block rounded bg-info/20 px-2 py-1 text-xs font-semibold text-info">
            Updated {updated}
          </span>
        )}
        {badges}
      </div>
    </header>
  );
}

