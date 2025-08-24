import React, { useState } from 'react';

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface FetchMeta {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirects: { url: string; status: number }[];
  altSvc?: string;
  http3: {
    supported: boolean;
    h1: number;
    h3?: number;
    delta?: number;
    error?: string;
  };
}

interface ApiResult {
  url1: FetchMeta;
  url2: FetchMeta;
  bodyDiff: DiffPart[];
  headersDiff: DiffPart[];
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c as keyof Record<string, string>] ?? c);
}

function renderSideBySide(diff: DiffPart[]) {
  const left: string[] = [];
  const right: string[] = [];

  diff.forEach((part) => {
    const lines = part.value.split('\n');
    lines.forEach((line, i) => {
      if (i === lines.length - 1 && line === '') return;
      const escaped = escapeHtml(line);
      if (part.added) {
        left.push('<span class="block"></span>');
        right.push(`<span class="bg-green-500/30">${escaped}</span>`);
      } else if (part.removed) {
        left.push(`<span class="bg-red-500/30">${escaped}</span>`);
        right.push('<span class="block"></span>');
      } else {
        left.push(`<span>${escaped}</span>`);
        right.push(`<span>${escaped}</span>`);
      }
    });
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <pre
        className="bg-gray-800 text-white p-2 overflow-auto"
        dangerouslySetInnerHTML={{ __html: left.join('\n') }}
      />
      <pre
        className="bg-gray-800 text-white p-2 overflow-auto"
        dangerouslySetInnerHTML={{ __html: right.join('\n') }}
      />
    </div>
  );
}

const HttpDiff: React.FC = () => {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/http-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1, url2 }),
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="First URL"
          value={url1}
          onChange={(e) => setUrl1(e.target.value)}
        />
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="Second URL"
          value={url2}
          onChange={(e) => setUrl2(e.target.value)}
        />
        <button
          type="button"
          onClick={handleCompare}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Compare
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {data && (
        <div className="flex flex-col space-y-4 overflow-auto">
          <div>
            <h2 className="font-bold mb-1">HTTP/3 Support</h2>
            <div className="grid grid-cols-2 gap-4">
              {[data.url1, data.url2].map((info, idx) => (
                <div key={idx} className="bg-gray-800 p-2 rounded space-y-1 break-words">
                  <div className="font-semibold">{info.finalUrl}</div>
                  <div>Alt-Svc: {info.altSvc ?? 'none'}</div>
                  <div>
                    {info.http3.supported
                      ? `HTTP/3 latency ${Math.round(info.http3.h3 ?? 0)}ms (Δ ${Math.round(
                          info.http3.delta ?? 0
                        )}ms)`
                      : 'HTTP/3 not supported'}
                  </div>
                  {info.http3.error && (
                    <div className="text-red-400">{info.http3.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold mb-1">Body Diff</h2>
            {renderSideBySide(data.bodyDiff)}
          </div>
          <div>
            <h2 className="font-bold mb-1">Headers Diff</h2>
            {renderSideBySide(data.headersDiff)}
          </div>
        </div>
      )}
    </div>
  );
};

export default HttpDiff;

