import React, { useState, useCallback } from 'react';
import CryptoJS from 'crypto-js';

function murmurhash3_32_gc(key: string, seed = 0): string {
  let remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;
  let k1 = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = (k1 * c1) | 0;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (k1 * c2) | 0;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (h1 * 5 + 0xe6546b64) | 0;
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    // eslint-disable-next-line no-fallthrough
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    // eslint-disable-next-line no-fallthrough
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = (k1 * c1) | 0;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (k1 * c2) | 0;
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = (h1 * 0x85ebca6b) | 0;
  h1 ^= h1 >>> 13;
  h1 = (h1 * 0xc2b2ae35) | 0;
  h1 ^= h1 >>> 16;

  return (h1 | 0).toString();
}

const PROXY_PREFIX = 'https://r.jina.ai/';

const FaviconHash: React.FC = () => {
  const [url, setUrl] = useState('');
  const [murmur, setMurmur] = useState('');
  const [md5, setMd5] = useState('');
  const [redirects, setRedirects] = useState<string[]>([]);
  const [finalUrl, setFinalUrl] = useState('');
  const [error, setError] = useState('');
  const [showProxy, setShowProxy] = useState(false);

  const copy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  const buildUrl = useCallback((raw: string) => {
    let target = raw.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    if (!/\.(ico|png|jpe?g|gif|svg)$/i.test(target)) {
      target = target.replace(/\/$/, '') + '/favicon.ico';
    }
    return target;
  }, []);

  const fetchIcon = useCallback(
    async (useProxy = false) => {
      setMurmur('');
      setMd5('');
      setError('');
      setRedirects([]);
      setFinalUrl('');
      setShowProxy(false);

      if (!url.trim()) {
        setError('Enter a URL');
        return;
      }

      const initialUrl = buildUrl(url);
      const chain = [initialUrl];
      const targetUrl = useProxy ? `${PROXY_PREFIX}${initialUrl}` : initialUrl;
      let res: Response;
      try {
        res = await fetch(targetUrl, { redirect: 'follow' });
      } catch (e) {
        try {
          await fetch(targetUrl, { mode: 'no-cors' });
          setError('CORS error: target blocks cross-origin requests.');
          setShowProxy(true);
        } catch {
          setError('Network error: failed to reach URL.');
          setShowProxy(true);
        }
        return;
      }

      if (res.type === 'opaqueredirect' && !useProxy) {
        fetchIcon(true);
        return;
      }

      if (!res.ok) {
        if (res.status === 404) setError('404 error: favicon not found.');
        else setError(`HTTP ${res.status}`);
        setShowProxy(true);
        return;
      }

      const final = res.url;
      if (final !== initialUrl) chain.push(final);
      setRedirects(chain);
      setFinalUrl(final);

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const base64 = btoa(binary);
      const mmh3 = murmurhash3_32_gc(base64);
      const md5hex = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(binary)).toString();
      setMurmur(mmh3);
      setMd5(md5hex);
    },
    [url, buildUrl]
  );

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col items-center space-y-4">
      <div className="flex space-x-2 w-full max-w-md">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 p-2 rounded text-black"
        />
        <button
          type="button"
          onClick={() => fetchIcon(false)}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Fetch
        </button>
      </div>
      {error && (
        <div className="text-red-400 space-y-2 text-center">
          <div>{error}</div>
          {showProxy && (
            <button
              type="button"
              className="px-2 py-1 bg-blue-600 rounded"
              onClick={() => fetchIcon(true)}
            >
              Use Proxy
            </button>
          )}
        </div>
      )}
      {redirects.length > 0 && (
        <div className="w-full max-w-md text-sm break-all space-y-1">
          <div className="font-semibold">Redirect chain:</div>
          <ul className="list-disc list-inside">
            {redirects.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="mt-1">Final URL: {finalUrl}</div>
        </div>
      )}
      {murmur && md5 && (
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">MMH3:</span>
            <span className="flex-1 break-all">{murmur}</span>
            <button
              type="button"
              onClick={() => copy(murmur)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">MD5:</span>
            <span className="flex-1 break-all">{md5}</span>
            <button
              type="button"
              onClick={() => copy(md5)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <a
            href={`https://www.shodan.io/search?query=http.favicon.hash:${murmur}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            Shodan search
          </a>
        </div>
      )}
    </div>
  );
};

export default FaviconHash;
