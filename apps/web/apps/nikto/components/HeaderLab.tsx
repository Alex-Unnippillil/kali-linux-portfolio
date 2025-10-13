'use client';

import React, { useMemo, useState } from 'react';

interface HeaderMap {
  [key: string]: string;
}

const securityChecks: { header: string; tip: string }[] = [
  {
    header: 'content-security-policy',
    tip: 'Add Content-Security-Policy to restrict sources and reduce XSS risk.',
  },
  {
    header: 'x-frame-options',
    tip: 'Add X-Frame-Options to protect against clickjacking.',
  },
  {
    header: 'strict-transport-security',
    tip: 'Use Strict-Transport-Security to enforce HTTPS.',
  },
  {
    header: 'x-content-type-options',
    tip: 'Set X-Content-Type-Options: nosniff to prevent MIME-type sniffing.',
  },
  {
    header: 'referrer-policy',
    tip: 'Define a Referrer-Policy to limit leaked referrer data.',
  },
];

const riskyHeaders: Record<string, (value: string) => string | null> = {
  server: () =>
    'Consider removing or obfuscating the Server header to limit information disclosure.',
  'x-powered-by': () =>
    'Remove X-Powered-By to hide framework details.',
  'x-aspnet-version': () =>
    'Remove X-AspNet-Version to avoid revealing .NET version.',
  'access-control-allow-origin': (value) =>
    value.trim() === '*'
      ? 'Avoid using a wildcard Access-Control-Allow-Origin; specify trusted domains instead.'
      : null,
  'set-cookie': (value) => {
    const lower = value.toLowerCase();
    const tips: string[] = [];
    if (!lower.includes('httponly'))
      tips.push('Set-Cookie should include HttpOnly to protect against XSS.');
    if (!lower.includes('secure'))
      tips.push('Set-Cookie should include Secure to ensure transmission over HTTPS.');
    return tips.length ? tips.join(' ') : null;
  },
};

const parseHeaders = (text: string): HeaderMap => {
  const map: HeaderMap = {};
  text.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const name = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (name) map[name] = value;
    }
  });
  return map;
};

const HeaderLab: React.FC = () => {
  const [input, setInput] = useState('');

  const headers = useMemo(() => parseHeaders(input), [input]);

  const hints = useMemo(() => {
    const tips: string[] = [];
    securityChecks.forEach(({ header, tip }) => {
      if (!(header in headers)) tips.push(tip);
    });
    Object.entries(riskyHeaders).forEach(([header, fn]) => {
      const value = headers[header];
      if (value) {
        const msg = fn(value);
        if (msg) tips.push(msg);
      }
    });
    return tips;
  }, [headers]);

  return (
    <section className="space-y-5 rounded-3xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl shadow-black/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-white">Header Lab</h2>
        <div className="flex flex-wrap gap-2 text-xs text-gray-300">
          <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1">Missing header checks</span>
          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1">Risky value hints</span>
        </div>
      </div>
      <label htmlFor="nikto-header-lab-input" className="sr-only" id="nikto-header-lab-label">
        HTTP response headers
      </label>
      <textarea
        id="nikto-header-lab-input"
        className="h-40 w-full rounded-2xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        placeholder="Paste raw HTTP response headers here"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        aria-labelledby="nikto-header-lab-label"
      />
      {Object.keys(headers).length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/60">
          <header className="border-b border-gray-800/80 bg-gray-900/70 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">Parsed Headers</h3>
          </header>
          <div className="max-h-60 overflow-auto">
            <table className="min-w-full divide-y divide-gray-800 text-sm">
              <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">Header</th>
                  <th scope="col" className="px-4 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/60 font-mono">
                {Object.entries(headers).map(([name, value]) => (
                  <tr key={name} className="odd:bg-gray-900/40">
                    <td className="px-4 py-2 text-sky-200">{name}</td>
                    <td className="px-4 py-2 break-all text-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {hints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">Security Tips</h3>
          <ul className="space-y-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {hints.map((tip, i) => (
              <li key={i} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default HeaderLab;

