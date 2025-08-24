import React, { useState, useMemo } from 'react';

interface UrlEntry {
  loc: string;
  lastmod?: string;
  priority?: number;
  changefreq?: string;
  ms?: number;
  status?: number;
}

interface TreeNode {
  name: string;
  children: Record<string, TreeNode>;
  url?: UrlEntry;
}

const freqScore: Record<string, number> = {
  always: 7,
  hourly: 6,
  daily: 5,
  weekly: 4,
  monthly: 3,
  yearly: 2,
  never: 1,
};

const buildTree = (urls: UrlEntry[]): TreeNode => {
  const root: TreeNode = { name: '/', children: {} };
  urls.forEach((u) => {
    try {
      const parts = new URL(u.loc).pathname.split('/').filter(Boolean);
      let node = root;
      parts.forEach((p) => {
        node.children[p] = node.children[p] || { name: p, children: {} };
        node = node.children[p];
      });
      node.url = u;
    } catch {
      // ignore invalid URLs
    }
  });
  return root;
};

const SitemapHeatmap = () => {
  const [origin, setOrigin] = useState('');
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<'priority' | 'changefreq' | 'responseTime'>('priority');
  const [progress, setProgress] = useState(0);

  const fetchSitemap = async () => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await fetch(`/api/sitemap-heatmap?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      setUrls(data.ok ? data.urls : []);
    } catch {
      setUrls([]);
    }
    setLoading(false);
  };

  const crawl = async () => {
    for (let i = 0; i < urls.length; i += 1) {
      try {
        const res = await fetch(`/api/sitemap-crawl?url=${encodeURIComponent(urls[i].loc)}`);
        const data = await res.json();
        urls[i] = { ...urls[i], ms: data.time, status: data.status };
        setUrls([...urls]);
      } catch {
        // ignore
      }
      setProgress((i + 1) / urls.length);
    }
  };

  const maxValue = useMemo(() => {
    return Math.max(
      ...urls.map((u) => {
        if (metric === 'priority') return u.priority ?? 0;
        if (metric === 'changefreq') return freqScore[u.changefreq ?? 'never'] ?? 0;
        return u.ms ?? 0;
      }),
      0
    );
  }, [urls, metric]);

  const colorFor = (u?: UrlEntry) => {
    if (!u) return undefined;
    let val = 0;
    if (metric === 'priority') val = u.priority ?? 0;
    else if (metric === 'changefreq') val = freqScore[u.changefreq ?? 'never'] ?? 0;
    else val = u.ms ?? 0;
    const ratio = maxValue ? val / maxValue : 0;
    return `rgba(16,185,129,${ratio || 0.1})`;
  };

  const tree = useMemo(() => buildTree(urls), [urls]);

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => (
    <ul className={depth === 0 ? '' : 'ml-4'}>
      {Object.values(node.children).map((child) => (
        <li
          key={child.name}
          style={{ backgroundColor: colorFor(child.url) }}
          className="mb-1"
        >
          {child.name}
          {renderNode(child, depth + 1)}
        </li>
      ))}
    </ul>
  );

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
        {urls.length > 0 && (
          <button onClick={crawl} className="px-4 py-2 bg-green-600 rounded">
            Crawl
          </button>
        )}
      </div>
      {urls.length > 0 && (
        <div>
          <div className="mb-2">
            <label htmlFor="metric" className="mr-2">
              Metric:
            </label>
            <select
              id="metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="text-black p-1"
            >
              <option value="priority">Priority</option>
              <option value="changefreq">Frequency</option>
              <option value="responseTime">Response Time</option>
            </select>
            {progress > 0 && progress < 1 && (
              <span className="ml-2">{Math.round(progress * 100)}%</span>
            )}
          </div>
          {renderNode(tree)}
        </div>
      )}
    </div>
  );
};

export default SitemapHeatmap;

export const displaySitemapHeatmap = () => <SitemapHeatmap />;

