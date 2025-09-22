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
    <div className="space-y-4">
      <h2 className="text-lg mb-2">Header Lab</h2>
        <textarea
          className="w-full h-40 p-2 rounded text-black"
          placeholder="Paste raw HTTP response headers here"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="HTTP response headers"
        />
      {Object.keys(headers).length > 0 && (
        <div>
          <h3 className="text-md mb-1">Parsed Headers</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(headers).map(([name, value]) => (
                <tr key={name} className="odd:bg-gray-900">
                  <td className="p-1 font-mono">{name}</td>
                  <td className="p-1 font-mono break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hints.length > 0 && (
        <div>
          <h3 className="text-md mb-1">Security Tips</h3>
          <ul className="list-disc ml-6 space-y-1 text-green-300">
            {hints.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HeaderLab;

