import React, { useState } from 'react';

interface ApiResult {
  ok: boolean;
  headers?: {
    'cache-control': string | null;
    etag: string | null;
    vary: string | null;
  };
  grade?: string;
  error?: string;
}

const CachePolicy: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkPolicy = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/cache-policy?url=${encodeURIComponent(url)}`);
      const data: ApiResult = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = () => {
    if (!result?.headers) return [] as string[];
    const { 'cache-control': cc, etag, vary } = result.headers;
    const msgs: string[] = [];
    if (!cc) msgs.push('Add a Cache-Control header with appropriate max-age.');
    else if (/no-store/i.test(cc)) msgs.push('Avoid using no-store for cacheable assets.');
    if (!etag) msgs.push('Provide an ETag header for validation.');
    if (!vary) msgs.push('Specify a Vary header for proxy caches.');
    return msgs;
  };

  const suggs = suggestions();

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          className="flex-1 p-2 text-black"
        />
        <button
          type="button"
          onClick={checkPolicy}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {result && (
        <div className="space-y-2">
          {result.ok ? (
            <>
              <div>Grade: {result.grade}</div>
              <ul className="text-sm">
                <li>Cache-Control: {result.headers?.['cache-control'] || 'None'}</li>
                <li>ETag: {result.headers?.etag || 'None'}</li>
                <li>Vary: {result.headers?.vary || 'None'}</li>
              </ul>
              {suggs.length > 0 ? (
                <div>
                  <div className="font-semibold mt-2">Suggestions</div>
                  <ul className="list-disc list-inside text-sm">
                    {suggs.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm mt-2">Policy looks good!</div>
              )}
            </>
          ) : (
            <div className="text-red-500">{result.error || 'Error'}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CachePolicy;

