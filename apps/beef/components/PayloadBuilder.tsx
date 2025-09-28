'use client';

import React, { useMemo, useState } from 'react';
import { getCspNonce } from '../../../utils/csp';

interface Payload {
  name: string;
  code: string;
}

const payloads: Payload[] = [
  { name: 'Alert Box', code: "alert('BeEF demo payload');" },
  { name: 'Console Log', code: "console.log('BeEF demo payload executed');" },
  {
    name: 'Change Background',
    code: "document.body.style.background='lightyellow';",
  },
];

export default function PayloadBuilder() {
  const [selected, setSelected] = useState<Payload>(payloads[0]);
  const [copied, setCopied] = useState(false);

  const payloadNonce = useMemo(() => {
    const existing = getCspNonce();
    if (existing) return existing;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
      );
    }
    return undefined;
  }, []);

  const page = useMemo(() => {
    const policy = `default-src 'none'; script-src ${
      payloadNonce ? `'nonce-${payloadNonce}'` : "'unsafe-inline'"
    }; connect-src 'none'`;
    const nonceAttr = payloadNonce ? ` nonce="${payloadNonce}"` : '';
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Payload</title></head><body><script${nonceAttr}>${selected.code}</script></body></html>`;
  }, [selected, payloadNonce]);

  const copyPage = async () => {
    try {
      await navigator.clipboard.writeText(page);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = payloads.find((p) => p.name === e.target.value);
    setSelected(next || payloads[0]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="payloadSelect" className="text-sm">
          Payload:
        </label>
        <select
          id="payloadSelect"
          value={selected.name}
          onChange={handleSelect}
          className="text-black px-1 py-0.5 rounded"
        >
          {payloads.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={copyPage}
          className="px-2 py-1 bg-ub-gray-50 text-black rounded"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <textarea
        value={page}
        readOnly
        rows={6}
        className="w-full text-black p-1 rounded"
      />
      <div className="border h-48">
        <iframe
          title="preview"
          sandbox="allow-scripts"
          srcDoc={page}
          className="w-full h-full border-0"
        />
      </div>
      <p className="text-xs">
        Payloads run locally in a sandbox and never touch the network.
      </p>
    </div>
  );
}

