import React, { useState, useMemo } from 'react';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface RobotsData {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  missingRobots?: boolean;
}

const RobotsSitemap: React.FC = () => {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<RobotsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setData(null);
    if (!url) return;
    try {
      const res = await fetch(`/api/robots?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError('Failed to fetch');
    }
  };

  const heatmap = useMemo(() => {
    if (!data) return [] as { date: string; count: number }[];
    const counts: Record<string, number> = {};
    data.sitemapEntries.forEach((entry) => {
      if (!entry.lastmod) return;
      const date = entry.lastmod.split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [data]);

  const maxCount = Math.max(0, ...heatmap.map((d) => d.count));

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-2 text-black"
        />
        <button
          type="button"
          onClick={load}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Load
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {data && (
        <div className="space-y-4">
          {data.missingRobots && (
            <div className="text-yellow-500">robots.txt not found</div>
          )}
          <div>
            <h2 className="font-bold mb-1">Disallowed Paths</h2>
            {data.disallows.length ? (
              <ul className="list-disc ml-5">
                {data.disallows.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : (
              <div>No disallow rules</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Sitemap Lastmod Heatmap</h2>
            {heatmap.length ? (
              <div className="grid grid-cols-7 gap-1">
                {heatmap.map(({ date, count }) => {
                  const intensity = maxCount ? Math.round((count / maxCount) * 255) : 0;
                  const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                  return (
                    <div
                      key={date}
                      title={`${date}: ${count}`}
                      className="w-6 h-6"
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            ) : (
              <div>No sitemap entries</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotsSitemap;

