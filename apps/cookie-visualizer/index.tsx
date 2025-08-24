import React, { useState } from 'react';
import { CookieInfo, parseSetCookies, buildRecipe } from '../../lib/cookie-visualizer';

const ratingClass = (rating: string) => {
  switch (rating) {
    case 'A':
      return 'bg-green-600';
    case 'B':
      return 'bg-green-500';
    case 'C':
      return 'bg-yellow-500';
    case 'D':
      return 'bg-orange-500';
    default:
      return 'bg-red-600';
  }
};

function expiryProgress(c: CookieInfo): number {
  if (c.expired) return 0;
  if (c.maxAge && c.expires) {
    const ageMs = parseInt(c.maxAge, 10) * 1000;
    const remaining = new Date(c.expires).getTime() - Date.now();
    return Math.max(0, Math.min(100, (remaining / ageMs) * 100));
  }
  if (c.expires) {
    const remaining = new Date(c.expires).getTime() - Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.min(100, (remaining / oneYear) * 100));
  }
  return 100;
}

const CookieVisualizer: React.FC = () => {
  const [url, setUrl] = useState('https://example.com');
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [filter, setFilter] = useState('all');

  const fetchCookies = async () => {
    try {
      const res = await fetch('/api/cookie-visualizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (Array.isArray(data.cookies)) {
        setCookies(parseSetCookies(data.cookies));
      } else {
        setCookies([]);
      }
    } catch {
      setCookies([]);
    }
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(cookies, null, 2)], { type: 'application/json' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = 'cookie-visualizer-report.json';
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  const filtered = cookies.filter((c) => filter === 'all' || c.rating === filter);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black p-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <button type="button" onClick={fetchCookies} className="px-4 py-1 bg-blue-600 rounded">
          Fetch
        </button>
        {cookies.length > 0 && (
          <button type="button" onClick={exportReport} className="px-4 py-1 bg-green-600 rounded">
            Export
          </button>
        )}
      </div>
      {cookies.length > 0 && (
        <>
          <div>
            <label className="mr-2">Filter:</label>
            <select className="text-black p-1" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1">Rating</th>
                  <th className="px-2 py-1 text-left">Cookie</th>
                  <th className="px-2 py-1">Domain</th>
                  <th className="px-2 py-1">Path</th>
                  <th className="px-2 py-1">Secure</th>
                  <th className="px-2 py-1">HttpOnly</th>
                  <th className="px-2 py-1">SameSite</th>
                  <th className="px-2 py-1">Expires</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.name} className="odd:bg-gray-800">
                    <td className="px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded text-black ${ratingClass(c.rating)}`}>{c.rating}</span>
                    </td>
                    <td className="px-2 py-1 text-left break-all">{c.name}</td>
                    <td className="px-2 py-1 break-all">{c.domain || 'Host-only'}</td>
                    <td className="px-2 py-1 break-all">{c.path || 'Default'}</td>
                    <td className={`px-2 py-1 ${c.secure ? 'text-green-500' : 'text-red-500'}`}>{c.secure ? 'Yes' : 'No'}</td>
                    <td className={`px-2 py-1 ${c.httpOnly ? 'text-green-500' : 'text-red-500'}`}>{c.httpOnly ? 'Yes' : 'No'}</td>
                    <td className={`px-2 py-1 ${c.sameSite && c.sameSite.toLowerCase() !== 'none' ? 'text-green-500' : 'text-red-500'}`}>{c.sameSite || 'Missing'}</td>
                    <td className={`px-2 py-1 ${c.expires ? (c.expired ? 'text-red-500' : 'text-green-500') : 'text-yellow-500'}`}>{c.expires || 'Session'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 space-y-2">
              {filtered.map((c) => (
                <div key={c.name}>
                  <div className="font-bold flex items-center space-x-2">
                    <span>{c.name}</span>
                    <span className={`px-2 py-0.5 rounded text-black ${ratingClass(c.rating)}`}>{c.rating}</span>
                  </div>
                  <div className="text-xs">Scope: {(c.domain || 'host-only') + (c.path || '/')}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-700 h-2">
                      <div className="bg-green-500 h-2" style={{ width: `${expiryProgress(c)}%` }} />
                    </div>
                    <div className="text-xs">{c.expires || 'Session'}</div>
                  </div>
                  {c.issues.length > 0 ? (
                    <ul className="list-disc list-inside text-sm">
                      {c.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-green-500 text-sm">No issues detected.</div>
                  )}
                  <code className="block text-xs mt-1 break-all">{buildRecipe(c)}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(buildRecipe(c))}
                    className="mt-1 px-2 py-1 bg-blue-600 rounded"
                  >
                    Copy recipe
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CookieVisualizer;
