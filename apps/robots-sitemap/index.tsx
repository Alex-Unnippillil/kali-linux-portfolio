import React, { useState, useMemo } from 'react';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
}

interface RobotsData {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  errors?: string[];
  missingRobots?: boolean;
}

const RobotsSitemap: React.FC = () => {
  const [url, setUrl] = useState('');
  const [filter, setFilter] = useState('');
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

  const filteredEntries = useMemo(() => {
    if (!data) return [] as SitemapEntry[];
    return data.sitemapEntries.filter((e) => e.loc.includes(filter));
  }, [data, filter]);

  const heat = useMemo(() => {
    if (!filteredEntries.length)
      return { rows: [] as string[], cols: [] as string[], matrix: [] as number[][] };
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const counts: Record<string, Record<string, number>> = {};
    filteredEntries.forEach((entry) => {
      const date = entry.lastmod ? entry.lastmod.split('T')[0] : 'unknown';
      const freq = entry.changefreq || 'none';
      rowSet.add(freq);
      colSet.add(date);
      counts[freq] = counts[freq] || {};
      counts[freq][date] = (counts[freq][date] || 0) + 1;
    });
    const rows = Array.from(rowSet).sort();
    const cols = Array.from(colSet).sort();
    const matrix = rows.map((r) => cols.map((c) => counts[r]?.[c] || 0));
    return { rows, cols, matrix };
  }, [filteredEntries]);

  const allCounts = heat.matrix.flat();
  const maxCount = Math.max(0, ...allCounts);
  const avg = allCounts.reduce((a, b) => a + b, 0) / (allCounts.length || 1);
  const std = Math.sqrt(
    allCounts.reduce((a, b) => a + (b - avg) ** 2, 0) / (allCounts.length || 1)
  );
  const threshold = avg + 2 * std;

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
          <div className="flex space-x-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="URL filter"
              className="flex-1 px-2 text-black"
            />
          </div>
          <div>
            <h2 className="font-bold mb-1">Sitemap Heatmap</h2>
            {heat.rows.length && heat.cols.length ? (
              <div className="overflow-auto">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th></th>
                      {heat.cols.map((c) => (
                        <th key={c} className="px-1 text-xs">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heat.rows.map((r, rIdx) => (
                      <tr key={r}>
                        <td className="pr-1 text-xs">{r}</td>
                        {heat.matrix[rIdx].map((count, cIdx) => {
                          const intensity = maxCount
                            ? Math.round((count / maxCount) * 255)
                            : 0;
                          const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                          const isOutlier = count > threshold;
                          return (
                            <td
                              key={cIdx}
                              title={`${r} ${heat.cols[cIdx]}: ${count}`}
                              className={`w-6 h-6 ${
                                isOutlier ? 'border-2 border-red-500' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>No sitemap entries</div>
            )}
          </div>
          {data.errors && data.errors.length > 0 && (
            <div>
              <h2 className="font-bold mb-1">Errors</h2>
              <ul className="list-disc ml-5 break-all">
                {data.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RobotsSitemap;

