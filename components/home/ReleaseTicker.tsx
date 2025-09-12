import { useEffect, useState } from 'react';
import releases from '../../public/data/releases.json';

interface ReleaseEntry {
  version: string;
  date: string;
  notes?: string;
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function ReleaseTicker() {
  const [items, setItems] = useState<ReleaseEntry[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setItems(releases as ReleaseEntry[]);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items]);

  if (!items.length) return null;

  const current = items[index];

  return (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-ub-cool-grey bg-opacity-90 text-white text-sm px-4 py-1 rounded shadow">
      <span className="whitespace-nowrap">
        {`v${current.version} - ${formatter.format(new Date(current.date))}`}
      </span>
    </div>
  );
}
