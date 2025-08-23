import React, { useState, useMemo } from 'react';

interface UrlEntry {
  loc: string;
  lastmod?: string;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SitemapHeatmap = () => {
  const [origin, setOrigin] = useState('');
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSitemap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sitemap-heatmap?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (data.ok) {
        setUrls(data.urls);
      } else {
        setUrls([]);
      }
    } catch {
      setUrls([]);
    }
    setLoading(false);
  };

  const counts = useMemo(() => {
    const arr = Array(12).fill(0);
    urls.forEach((u) => {
      if (u.lastmod) {
        const d = new Date(u.lastmod);
        if (!Number.isNaN(d.getTime())) arr[d.getMonth()] += 1;
      }
    });
    return arr;
  }, [urls]);

  const max = Math.max(...counts, 0);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 p-2 rounded text-black"
        />
        <button onClick={fetchSitemap} className="px-4 py-2 bg-blue-600 rounded" disabled={loading}>
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {urls.length > 0 && (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-1">URL</th>
                <th className="p-1">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((u, idx) => (
                <tr key={idx} className="border-t border-gray-700">
                  <td className="p-1 break-all">{u.loc}</td>
                  <td className="p-1">
                    {u.lastmod ? new Date(u.lastmod).toISOString().split('T')[0] : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-12 gap-1 mt-4">
            {months.map((m, i) => (
              <div
                key={m}
                className="h-4"
                style={{
                  backgroundColor: '#10b981',
                  opacity: max ? counts[i] / max : 0.1,
                }}
                title={`${m}: ${counts[i]}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SitemapHeatmap;

export const displaySitemapHeatmap = () => <SitemapHeatmap />;

