import React, { useState } from 'react';

interface CookieInfo {
  name: string;
  value: string;
  domain: string | null;
  path: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  expires: string | null;
  maxAge: string | null;
  expired: boolean;
  partitioned: boolean;
  issues: string[];
}

function parseCookies(headers: string): CookieInfo[] {
  const results: CookieInfo[] = [];
  const lines = headers.split(/\r?\n/);
  lines.forEach((line) => {
    const match = line.match(/^set-cookie:\s*(.*)$/i);
    if (!match) return;
    const cookieStr = match[1];
    const parts = cookieStr.split(';').map((p) => p.trim());
    if (parts.length === 0) return;
    const [nameValue, ...attrs] = parts;
    const eqIndex = nameValue.indexOf('=');
    const name = eqIndex >= 0 ? nameValue.slice(0, eqIndex) : nameValue;
    const value = eqIndex >= 0 ? nameValue.slice(eqIndex + 1) : '';

    const attrsLower = attrs.map((a) => a.toLowerCase());
    const secure = attrsLower.includes('secure');
    const httpOnly = attrsLower.includes('httponly');
    const partitioned = attrsLower.includes('partitioned');
    const sameSiteAttr = attrs.find((a) => a.toLowerCase().startsWith('samesite='));
    const sameSite = sameSiteAttr ? sameSiteAttr.split('=')[1] : null;
    const domainAttr = attrs.find((a) => a.toLowerCase().startsWith('domain='));
    const domain = domainAttr ? domainAttr.split('=')[1] : null;
    const pathAttr = attrs.find((a) => a.toLowerCase().startsWith('path='));
    const path = pathAttr ? pathAttr.split('=')[1] : null;
    const expiresAttr = attrs.find((a) => a.toLowerCase().startsWith('expires='));
    const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
    const maxAge = maxAgeAttr ? maxAgeAttr.split('=')[1] : null;

    let expires: string | null = null;
    let expired = false;
    if (expiresAttr) {
      const dateStr = expiresAttr.split('=')[1];
      expires = dateStr;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime())) {
        expired = date.getTime() <= Date.now();
      }
    } else if (maxAge) {
      const age = parseInt(maxAge, 10);
      const date = new Date(Date.now() + age * 1000);
      expires = date.toUTCString();
      expired = age <= 0;
    }

    const issues: string[] = [];
    if (!secure) issues.push('Add Secure attribute to transmit cookie only over HTTPS.');
    if (!httpOnly) issues.push('Add HttpOnly to prevent access via JavaScript.');
    if (!sameSite) {
      issues.push('Add SameSite=Lax or Strict to mitigate CSRF.');
    } else if (sameSite.toLowerCase() === 'none') {
      issues.push('Avoid SameSite=None unless necessary.');
    }
    if (!expiresAttr && !maxAgeAttr) {
      issues.push('No expiry set; cookie will be a session cookie.');
    } else if (expired) {
      issues.push('Cookie is already expired.');
    }
    if (sameSite && sameSite.toLowerCase() === 'none' && !secure) {
      issues.push('SameSite=None requires the Secure attribute.');
    }
    if (expiresAttr && maxAgeAttr) {
      issues.push('Avoid using both Expires and Max-Age.');
    }
    if (!path) {
      issues.push('No Path attribute; cookie defaults to request path.');
    }
    if (domain && domain.startsWith('.')) {
      issues.push('Domain with leading dot is deprecated.');
    }
    if (partitioned) {
      if (!secure) issues.push('Partitioned cookies require the Secure attribute.');
      if (!sameSite || sameSite.toLowerCase() !== 'none') {
        issues.push('Partitioned cookies require SameSite=None.');
      }
      if (path !== '/') {
        issues.push('Partitioned cookies require Path=/');
      }
    }

    results.push({
      name,
      value,
       domain,
       path,
      secure,
      httpOnly,
      sameSite,
      expires,
      maxAge,
      expired,
      partitioned,
      issues,
    });
  });
  return results;
}

function buildRecipe(c: CookieInfo): string {
  const attrs: string[] = [];
  const path = c.partitioned ? '/' : c.path || '/';
  attrs.push(`Path=${path}`);
  if (c.domain) attrs.push(`Domain=${c.domain}`);
  attrs.push('Secure');
  attrs.push('HttpOnly');
  const sameSite = c.partitioned ? 'None' : c.sameSite && c.sameSite.toLowerCase() !== 'none' ? c.sameSite : 'Lax';
  attrs.push(`SameSite=${sameSite}`);
  if (c.partitioned) attrs.push('Partitioned');
  if (c.expires) attrs.push(`Expires=${c.expires}`);
  else if (c.maxAge) attrs.push(`Max-Age=${c.maxAge}`);
  return `${c.name}=${c.value}; ${attrs.join('; ')}`;
}

const CookieJar: React.FC = () => {
  const [headers, setHeaders] = useState('');
  const [cookies, setCookies] = useState<CookieInfo[]>([]);

  const analyze = () => {
    setCookies(parseCookies(headers));
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(cookies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookie-jar-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        className="flex-1 text-black p-2"
        placeholder="Paste HTTP response headers here..."
        value={headers}
        onChange={(e) => setHeaders(e.target.value)}
      />
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={analyze}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Analyze
        </button>
        {cookies.length > 0 && (
          <button
            type="button"
            onClick={exportReport}
            className="px-4 py-1 bg-green-600 rounded"
          >
            Export
          </button>
        )}
      </div>
      {cookies.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Cookie</th>
                <th className="px-2 py-1">Domain</th>
                <th className="px-2 py-1">Path</th>
                <th className="px-2 py-1">Secure</th>
                <th className="px-2 py-1">HttpOnly</th>
                <th className="px-2 py-1">SameSite</th>
                <th className="px-2 py-1">Expires</th>
                <th className="px-2 py-1">Max-Age</th>
                <th className="px-2 py-1">Partitioned</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((c) => (
                <tr key={c.name} className="odd:bg-gray-800">
                  <td className="px-2 py-1 text-left break-all">{c.name}</td>
                  <td className="px-2 py-1 break-all">{c.domain || 'Host-only'}</td>
                  <td className="px-2 py-1 break-all">{c.path || 'Default'}</td>
                  <td className={`px-2 py-1 ${c.secure ? 'text-green-500' : 'text-red-500'}`}>{c.secure ? 'Yes' : 'No'}</td>
                  <td className={`px-2 py-1 ${c.httpOnly ? 'text-green-500' : 'text-red-500'}`}>{c.httpOnly ? 'Yes' : 'No'}</td>
                  <td className={`px-2 py-1 ${c.sameSite && c.sameSite.toLowerCase() !== 'none' ? 'text-green-500' : 'text-red-500'}`}>{c.sameSite || 'Missing'}</td>
                  <td className={`px-2 py-1 ${c.expires ? (c.expired ? 'text-red-500' : 'text-green-500') : 'text-yellow-500'}`}>{c.expires || 'Session'}</td>
                  <td className="px-2 py-1">{c.maxAge || '-'}</td>
                  <td className={`px-2 py-1 ${c.partitioned ? 'text-green-500' : 'text-red-500'}`}>{c.partitioned ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-2">
            {cookies.map((c) => (
              <div key={c.name}>
                <div className="font-bold">{c.name}</div>
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
      )}
    </div>
  );
};

export default CookieJar;

