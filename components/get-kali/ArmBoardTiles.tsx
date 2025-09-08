import React from 'react';

type Compatibility = 'official' | 'community' | 'untested';

interface Board {
  name: string;
  compatibility: Compatibility;
}

const boards: Board[] = [
  { name: 'Raspberry Pi 4', compatibility: 'official' },
  { name: 'BeagleBone Black', compatibility: 'community' },
  { name: 'Pine64', compatibility: 'untested' },
  { name: 'Orange Pi 5', compatibility: 'community' },
  { name: 'Radxa Rock 5', compatibility: 'untested' },
  { name: 'ODROID XU4', compatibility: 'official' },
];

const tones: Record<Compatibility, string> = {
  official: 'bg-green-600 text-white',
  community: 'bg-yellow-500 text-black',
  untested: 'bg-gray-400 text-black',
};

const labels: Record<Compatibility, string> = {
  official: 'Official',
  community: 'Community',
  untested: 'Untested',
};

function CompatibilityBadge({ level }: { level: Compatibility }) {
  return (
    <span
      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${tones[level]}`}
    >
      {labels[level]}
    </span>
  );
}

export default function ArmBoardTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-flow-row-dense">
      {boards.map((board) => (
        <div key={board.name} className="flex flex-col rounded border p-4">
          <div className="font-semibold">{board.name}</div>
          <div className="mt-2">
            <CompatibilityBadge level={board.compatibility} />
          </div>
        </div>
      ))}
    </div>
  );
}

