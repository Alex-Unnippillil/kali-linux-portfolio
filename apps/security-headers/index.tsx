import React, { useState } from 'react';

const SecurityHeaders: React.FC = () => {
  const [csp, setCsp] = useState("default-src 'self';");
  const [hsts, setHsts] = useState(31536000);
  const [includeSubDomains, setIncludeSubDomains] = useState(true);
  const [preload, setPreload] = useState(false);
  const [xFrame, setXFrame] = useState('SAMEORIGIN');
  const [referrer, setReferrer] = useState('no-referrer');
  const [permissions, setPermissions] = useState('');

  const buildHsts = () => {
    let header = `max-age=${hsts}`;
    if (includeSubDomains) header += '; includeSubDomains';
    if (preload) header += '; preload';
    return header;
  };

  const nginxSnippet = `add_header Content-Security-Policy "${csp}" always;\nadd_header Strict-Transport-Security "${buildHsts()}" always;\nadd_header X-Frame-Options "${xFrame}" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header Referrer-Policy "${referrer}" always;${permissions ? `\nadd_header Permissions-Policy "${permissions}" always;` : ''}`;

  const apacheSnippet = `<IfModule mod_headers.c>\n  Header set Content-Security-Policy "${csp}"\n  Header always set Strict-Transport-Security "${buildHsts()}"\n  Header set X-Frame-Options "${xFrame}"\n  Header set X-Content-Type-Options "nosniff"\n  Header set Referrer-Policy "${referrer}"${permissions ? `\n  Header set Permissions-Policy "${permissions}"` : ''}\n</IfModule>`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 overflow-auto">
      <h1 className="text-xl mb-4">Security Headers Generator</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="csp" className="block font-semibold">Content-Security-Policy</label>
          <textarea
            id="csp"
            value={csp}
            onChange={(e) => setCsp(e.target.value)}
            className="w-full text-black p-2"
            rows={3}
          />
          <p className="text-sm text-gray-400">Controls allowed sources for content on your site.</p>
        </div>
        <div>
          <label htmlFor="hsts" className="block font-semibold">HSTS max-age (seconds)</label>
          <input
            id="hsts"
            type="number"
            value={hsts}
            onChange={(e) => setHsts(parseInt(e.target.value, 10) || 0)}
            className="text-black px-2"
          />
          <div className="mt-1 space-x-4">
            <label>
              <input
                type="checkbox"
                checked={includeSubDomains}
                onChange={(e) => setIncludeSubDomains(e.target.checked)}
              />
              {' '}includeSubDomains
            </label>
            <label>
              <input
                type="checkbox"
                checked={preload}
                onChange={(e) => setPreload(e.target.checked)}
              />
              {' '}preload
            </label>
          </div>
          <p className="text-sm text-gray-400">Enforces HTTPS with HTTP Strict Transport Security.</p>
        </div>
        <div>
          <label htmlFor="xfo" className="block font-semibold">X-Frame-Options</label>
          <select
            id="xfo"
            value={xFrame}
            onChange={(e) => setXFrame(e.target.value)}
            className="text-black px-2"
          >
            <option value="DENY">DENY</option>
            <option value="SAMEORIGIN">SAMEORIGIN</option>
          </select>
          <p className="text-sm text-gray-400">Protects against clickjacking attacks.</p>
        </div>
        <div>
          <label htmlFor="referrer" className="block font-semibold">Referrer-Policy</label>
          <select
            id="referrer"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            className="text-black px-2"
          >
            <option value="no-referrer">no-referrer</option>
            <option value="no-referrer-when-downgrade">no-referrer-when-downgrade</option>
            <option value="same-origin">same-origin</option>
            <option value="strict-origin">strict-origin</option>
            <option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</option>
          </select>
          <p className="text-sm text-gray-400">Controls how much referrer information is included with requests.</p>
        </div>
        <div>
          <label htmlFor="permissions" className="block font-semibold">Permissions-Policy</label>
          <input
            id="permissions"
            type="text"
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
            className="w-full text-black p-2"
            placeholder="e.g. geolocation=()"
          />
          <p className="text-sm text-gray-400">Restricts use of powerful browser features.</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Nginx</h2>
            <button
              type="button"
              data-testid="copy-nginx"
              onClick={() => copy(nginxSnippet)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <pre data-testid="nginx-snippet" className="bg-gray-800 p-2 mt-2 text-sm whitespace-pre-wrap">{nginxSnippet}</pre>
        </div>
        <div>
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Apache</h2>
            <button
              type="button"
              data-testid="copy-apache"
              onClick={() => copy(apacheSnippet)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <pre data-testid="apache-snippet" className="bg-gray-800 p-2 mt-2 text-sm whitespace-pre-wrap">{apacheSnippet}</pre>
        </div>
      </div>
    </div>
  );
};

export default SecurityHeaders;
