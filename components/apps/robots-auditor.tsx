
import React, { useState } from 'react';
import { RobotsData, testPath, TestDecision } from '../../lib/robots';

interface Decision extends TestDecision {
  path: string;
  userAgent: string;
}

const RobotsAuditor: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [data, setData] = useState<RobotsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState('');
  const [userAgent, setUserAgent] = useState('*');
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setDecisions([]);
    try {
      const res = await fetch(`/api/robots-auditor?origin=${encodeURIComponent(origin)}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (e) {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const runTest = () => {
    if (!data) return;
    const result = testPath(data, userAgent, path);
    setDecisions([...decisions, { path, userAgent, ...result }]);
  };

  const exportDecisions = () => {
    const blob = new Blob([JSON.stringify(decisions, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decisions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-2 text-black"
        />
        <button
          onClick={load}
          disabled={loading || !origin}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          Audit
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {data && (
        <div className="space-y-4 overflow-auto">
          {data.missing && (
            <div className="text-yellow-500">robots.txt not found</div>
          )}
          <div>
            <h2 className="font-bold mb-1">Groups</h2>
            {data.groups.length ? (
              <div className="space-y-2">
                {data.groups.map((g, idx) => (
                  <div key={idx} className="border border-gray-700 p-2">
                    <div>
                      <span className="font-semibold">User-agents:</span> {g.userAgents.join(', ')}
                    </div>
                    <div>
                      <span className="font-semibold">Allow:</span>{' '}
                      {g.allows.length ? (
                        <ul className="list-disc ml-5">
                          {g.allows.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">Disallow:</span>{' '}
                      {g.disallows.length ? (
                        <ul className="list-disc ml-5">
                          {g.disallows.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No groups</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Sitemaps</h2>
            {data.sitemaps.length ? (
              <ul className="list-disc ml-5 break-all">
                {data.sitemaps.map((u) => (
                  <li key={u}>
                    <a href={u} className="underline" target="_blank" rel="noreferrer">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No sitemaps</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Path Tester</h2>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/some/path"
                className="flex-1 px-2 text-black"
              />
              <input
                type="text"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="User-Agent"
                className="px-2 w-40 text-black"
              />
              <button
                onClick={runTest}
                disabled={!path}
                className="px-4 py-1 bg-green-600 rounded disabled:opacity-50"
              >
                Test
              </button>
            </div>
            {decisions.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={exportDecisions}
                  className="px-3 py-1 bg-blue-700 rounded"
                >
                  Export
                </button>
                <ul className="list-disc ml-5 break-all">
                  {decisions.map((d, idx) => (
                    <li key={idx}>
                      {d.userAgent} {d.path} →{' '}
                      {d.allowed ? 'Allow' : 'Disallow'}
                      {d.matchedRule && ` (rule: ${d.matchedRule})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotsAuditor;

export const displayRobotsAuditor = () => <RobotsAuditor />;
