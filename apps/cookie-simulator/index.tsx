import React, { useState, useMemo } from 'react';

interface TargetResult {
  url: string;
  included: boolean;
  curl: string;
  reasons: string[];
}

function getSite(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join('.');
}

function isValidDomain(domain: string): boolean {
  return /^[a-zA-Z0-9.-]+$/.test(domain) && domain.includes('.');
}

const CookieSimulator: React.FC = () => {
  const [origin, setOrigin] = useState('https://example.com');
  const [name, setName] = useState('test');
  const [value, setValue] = useState('1');
  const [domain, setDomain] = useState('');
  const [path, setPath] = useState('/');
  const [secure, setSecure] = useState(false);
  const [sameSite, setSameSite] = useState('');
  const [targets, setTargets] = useState('https://example.com/\nhttps://sub.example.com/\nhttp://example.com/');

  const domainValid = useMemo(() => !domain || isValidDomain(domain), [domain]);
  const sameSiteValid = useMemo(
    () => !sameSite || ['lax', 'strict', 'none'].includes(sameSite.toLowerCase()),
    [sameSite],
  );

  const targetList = useMemo(
    () => targets.split(/\n+/).map((t) => t.trim()).filter(Boolean),
    [targets],
  );

  const originValid = useMemo(() => {
    try {
      new URL(origin);
      return true;
    } catch {
      return false;
    }
  }, [origin]);

  const results = useMemo(() => {
    let originUrl: URL | null = null;
    try {
      originUrl = new URL(origin);
    } catch {
      originUrl = null;
    }
    if (!originUrl) return [] as TargetResult[];
    const originSite = getSite(originUrl.hostname);

    return targetList.map((input) => {
      try {
        const t = new URL(input);
        const reasons: string[] = [];
        let included = true;

        if (secure && t.protocol !== 'https:') {
          included = false;
          reasons.push('Secure requires HTTPS');
        }

        if (!domainValid) {
          included = false;
          reasons.push('Invalid Domain attribute');
        }
        if (!sameSiteValid) {
          included = false;
          reasons.push('Invalid SameSite value');
        }

        const hostMatch = (() => {
          if (domain) {
            const d = domain.replace(/^\./, '').toLowerCase();
            return t.hostname === d || t.hostname.endsWith(`.${d}`);
          }
          return t.hostname === originUrl!.hostname;
        })();
        if (!hostMatch) {
          included = false;
          reasons.push('Domain mismatch');
        }

        if (path && !t.pathname.startsWith(path)) {
          included = false;
          reasons.push('Path mismatch');
        }

        if (sameSite) {
          const crossSite = getSite(t.hostname) !== originSite;
          const ss = sameSite.toLowerCase();
          if ((ss === 'lax' || ss === 'strict') && crossSite) {
            included = false;
            reasons.push(`SameSite=${sameSite} blocks cross-site`);
          }
          if (ss === 'none' && !secure) {
            included = false;
            reasons.push('SameSite=None requires Secure');
          }
        }

        const curl = `curl -H \"Cookie: ${name}=${value}\" ${t.href}`;
        return { url: t.href, included, curl, reasons };
      } catch {
        return { url: input, included: false, curl: '', reasons: ['Invalid URL'] };
      }
    });
  }, [targetList, origin, domain, path, secure, sameSite, name, value, domainValid, sameSiteValid]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          className="text-black p-1"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin URL"
        />
        <input
          className={`text-black p-1 ${!domainValid ? 'border-2 border-red-500' : ''}`}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Domain attribute"
        />
        <input
          className="text-black p-1"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Path attribute"
        />
        <select
          className={`text-black p-1 ${!sameSiteValid ? 'border-2 border-red-500' : ''}`}
          value={sameSite}
          onChange={(e) => setSameSite(e.target.value)}
        >
          <option value="">(no SameSite)</option>
          <option value="Lax">Lax</option>
          <option value="Strict">Strict</option>
          <option value="None">None</option>
        </select>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
          />
          <span>Secure</span>
        </label>
        <input
          className="text-black p-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cookie name"
        />
        <input
          className="text-black p-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cookie value"
        />
      </div>
      <textarea
        className="w-full h-24 text-black p-1"
        value={targets}
        onChange={(e) => setTargets(e.target.value)}
        placeholder="Target URLs, one per line"
      />
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">URL</th>
              <th className="px-2 py-1">Included</th>
              <th className="px-2 py-1">curl</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <React.Fragment key={r.url}>
                <tr className="odd:bg-gray-800">
                  <td className="px-2 py-1 break-all">{r.url}</td>
                  <td className={`px-2 py-1 text-center ${r.included ? 'text-green-500' : 'text-red-500'}`}>
                    {r.included ? 'Yes' : 'No'}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {r.curl && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(r.curl)}
                        className="px-2 py-1 bg-blue-600 rounded"
                      >
                        Copy
                      </button>
                    )}
                  </td>
                </tr>
                {r.reasons.length > 0 && (
                  <tr className="odd:bg-gray-800">
                    <td colSpan={3} className="px-2 pb-2 text-xs text-red-400">
                      {r.reasons.join('; ')}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {!originValid && (
        <div className="text-red-500 text-sm">Invalid origin URL</div>
      )}
    </div>
  );
};

export default CookieSimulator;

