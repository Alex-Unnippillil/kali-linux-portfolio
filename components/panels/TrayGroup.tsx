import Image from 'next/image';
import { useEffect, useState } from 'react';
import seedrandom from 'seedrandom';

interface ChangeLogEntry {
  version: string;
  date: string;
  changes: string[];
}

export default function TrayGroup() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);

  useEffect(() => {
    fetch('/data/changelog.json')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    const rng = seedrandom('tray-updates');
    const interval = setInterval(() => {
      // occasionally indicate an update
      setHasUpdate(rng() > 0.8);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const openUpdates = () => {
    window.open('/apps/plugin-manager?tab=updates', '_blank');
    setHasUpdate(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openUpdates}
        className="relative focus:outline-none"
        aria-label="Software updates"
        title={entries[0] ? `Latest version: ${entries[0].version}` : 'Software updates'}
      >
        <Image
          src="/themes/Yaru/status/download.svg"
          alt="updates"
          width={16}
          height={16}
          className="w-4 h-4"
        />
        {hasUpdate && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-ub-orange rounded-full" />
        )}
      </button>
    </div>
  );
}
