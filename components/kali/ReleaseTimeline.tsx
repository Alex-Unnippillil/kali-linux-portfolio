import { useEffect, useState } from 'react';

interface Release {
  title: string;
  link: string;
  date: string; // ISO date string
}

const ReleaseTimeline: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/kali-releases.json');
        if (!res.ok) throw new Error('Failed to fetch local release data');
        const data: Release[] = await res.json();
        data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setReleases(data);
      } catch (err) {
        console.error('Failed to fetch release data', err);
      }
    };
    load();
  }, []);

  if (releases.length === 0) {
    return <p className="text-center text-sm text-gray-400">Loading releases...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ol className="relative border-l border-gray-700">
        {releases.map((r) => (
          <li key={r.link} className="mb-10 ml-4">
            <div className="absolute w-3 h-3 bg-ubt-blue rounded-full mt-1.5 -left-1.5 border border-white" />
            <time
              className="mb-1 text-sm leading-none text-gray-400"
              dateTime={r.date}
            >
              {new Date(r.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
            <h3 className="text-lg font-semibold text-white">{r.title}</h3>
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ubt-blue hover:underline"
            >
              Read more ↗
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ReleaseTimeline;
