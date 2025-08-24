import React, { useState, useMemo } from 'react';
import ErrorPane from '../../components/ErrorPane';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  depth: number;
  status?: number;
  priority?: number;
  types?: string[];
  freshness?: number;
  searchConsole?: string;
}

interface RuleInfo {
  rule: string;
  type: 'allow' | 'disallow';
  overriddenBy?: string;
}

interface RobotsData {
  sitemaps: string[];
  sitemapEntries: SitemapEntry[];
  unsupported: string[];
  profiles: Record<string, RuleInfo[]>;
  missingRobots?: boolean;
  robotsUrl: string;
  errorCategories: Record<string, number>;
}

const RobotsSitemap: React.FC = () => {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<RobotsData | null>(null);
  const [fault, setFault] = useState<{ code: string; message: string } | null>(
    null
  );

  const load = async () => {
    setFault(null);
    setData(null);
    if (!url) return;
    try {
      const res = await fetch(`/api/robots?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json?.ok === false) {
        setFault({ code: json.code, message: json.message });
      } else {
        setData(json);
      }
    } catch (e) {
      setFault({ code: 'network_error', message: 'Failed to fetch' });
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

  const depthGroups = useMemo(() => {
    if (!data) return [] as { depth: number; entries: SitemapEntry[] }[];
    const groups: Record<number, SitemapEntry[]> = {};
    data.sitemapEntries.forEach((e) => {
      groups[e.depth] = groups[e.depth] || [];
      groups[e.depth].push(e);
    });
    return Object.entries(groups)
      .map(([depth, entries]) => ({ depth: Number(depth), entries }))
      .sort((a, b) => a.depth - b.depth);
  }, [data]);

  const coverageGaps = useMemo(() => {
    if (!data) return [] as SitemapEntry[];
    return data.sitemapEntries.filter((e) => !e.status || e.status >= 400);
  }, [data]);

  const priorityFreshness = useMemo(() => {
    if (!data) return [] as SitemapEntry[];
    return data.sitemapEntries;
  }, [data]);

  const errorCategories = useMemo(() => {
    if (!data) return [] as [string, number][];
    return Object.entries(data.errorCategories);
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
      {fault && <ErrorPane code={fault.code} message={fault.message} />}
      {data && !fault && (
        <div className="space-y-4">
          <div>
            <a
              href={data.robotsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              robots.txt
            </a>
          </div>
          {data.missingRobots && (
            <div className="text-yellow-500">robots.txt not found</div>
          )}
          <div>
            <h2 className="font-bold mb-1">Sitemaps</h2>
            {data.sitemaps.length ? (
              <ul className="list-disc ml-5 break-all">
                {data.sitemaps.map((s) => (
                  <li key={s}>
                    <a href={s} className="underline" target="_blank" rel="noreferrer">
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No sitemaps</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Crawler Profiles</h2>
            {Object.keys(data.profiles).length ? (
              <div className="space-y-2">
                {Object.entries(data.profiles).map(([ua, rules]) => (
                  <div key={ua} className="border border-gray-700 p-2">
                    <div className="font-semibold mb-1">{ua}</div>
                    {rules.length ? (
                      <ul className="list-disc ml-5 break-all">
                        {rules.map((r, i) => (
                          <li
                            key={i}
                            className={
                              r.overriddenBy
                                ? 'text-yellow-400'
                                : r.type === 'allow'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {r.type === 'allow' ? 'Allow' : 'Disallow'} {r.rule}
                            {r.overriddenBy && ` (overridden by ${r.overriddenBy})`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div>No rules</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>No profiles</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Unsupported Directives</h2>
            {data.unsupported.length ? (
              <ul className="list-disc ml-5 break-all">
                {data.unsupported.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <div>None</div>
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
          <div>
            <h2 className="font-bold mb-1">URL Priority & Freshness</h2>
            {priorityFreshness.length ? (
              <div className="flex flex-wrap gap-1">
                {priorityFreshness.map((e, i) => {
                  const priority = e.priority ?? 0;
                  const color = `rgba(34,197,94,${priority})`;
                  const age = e.freshness ?? Infinity;
                  const border =
                    age < 30
                      ? 'border-green-400'
                      : age < 90
                      ? 'border-yellow-400'
                      : 'border-red-400';
                  return (
                    <a
                      key={i}
                      href={e.searchConsole || e.loc}
                      target="_blank"
                      rel="noreferrer"
                      title={`${e.loc} (priority ${priority || 'n/a'}, ${age} days)`}
                      className={`w-4 h-4 border ${border}`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            ) : (
              <div>No sitemap entries</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Sitemap Treemap by Depth/Status</h2>
            {depthGroups.length ? (
              <div className="space-y-2">
                {depthGroups.map(({ depth, entries }) => (
                  <div key={depth}>
                    <div className="mb-1">Depth {depth}</div>
                    <div className="flex flex-wrap gap-1">
                      {entries.map((e, i) => {
                        const color = e.status && e.status < 400 ? '#4ade80' : '#f87171';
                        return (
                          <div
                            key={i}
                            title={`${e.loc} (${e.status || 'n/a'})`}
                            className="w-4 h-4"
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No sitemap entries</div>
            )}
          </div>
          {coverageGaps.length > 0 && (
            <div className="text-red-400">
              Coverage gaps: {coverageGaps.length} URLs with non-200 status.
            </div>
          )}
          <div>
            <h2 className="font-bold mb-1">Error Categories</h2>
            {errorCategories.length ? (
              <ul className="list-disc ml-5 break-all">
                {errorCategories.map(([code, count]) => (
                  <li key={code}>
                    {code}: {count}
                  </li>
                ))}
              </ul>
            ) : (
              <div>None</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotsSitemap;

