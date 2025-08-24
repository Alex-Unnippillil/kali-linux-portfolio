import React, { useState } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mail Auth',
  description:
    'Checklist for DMARC, SPF, DKIM, MTA-STS, TLS-RPT, DANE and BIMI with exportable reports',
};

type Result = {
  pass: boolean;
  record?: string;
  policy?: string;
  aspf?: string;
  adkim?: string;
  bits?: number;
  message?: string;
  recommendation?: string;
  example?: string;
  spec: string;
};

type Response = {
  spf: Result;
  dkim: Result;
  dmarc: Result;
  mtaSts: Result;
  tlsRpt: Result;
  dane: Result;
  bimi: Result;
  error?: string;
};

const CONTROLS = [
  { id: 'spf', label: 'SPF' },
  { id: 'dkim', label: 'DKIM' },

  { id: 'dmarc', label: 'DMARC' },
  { id: 'spf', label: 'SPF' },
  { id: 'dkim', label: 'DKIM' },
  { id: 'mtaSts', label: 'MTA-STS' },
  { id: 'tlsRpt', label: 'TLS-RPT' },
  { id: 'dane', label: 'DANE' },
  { id: 'bimi', label: 'BIMI' },
] as const;

type ControlId = typeof CONTROLS[number]['id'];

const MailAuth: React.FC = () => {
  const [domainsText, setDomainsText] = useState('');
  const [selector, setSelector] = useState('');
  const [results, setResults] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(false);

  const check = async () => {
    const domains = domainsText.split(/\s+/).filter(Boolean);
    if (domains.length === 0) return;
    setLoading(true);
    try {
      const entries = await Promise.all(
        domains.map(async (domain) => {
          const params = new URLSearchParams({ domain });
          if (selector) params.append('selector', selector);
          try {
            const res = await fetch(`/api/mail-auth?${params.toString()}`);
            if (!res.ok) throw new Error('Request failed');
            const data = await res.json();
            return [domain, data as Response];
          } catch (e: any) {
            return [domain, { error: e.message || 'Lookup failed' } as Response];
          }
        })
      );
      setResults(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const data: any[] = [];
    CONTROLS.forEach(({ id, label }) => {
      Object.entries(results).forEach(([domain, res]) => {
        if (res.error) return;
        const r = (res as any)[id as ControlId] as Result;
        data.push({
          Control: label,
          Domain: domain,
          Status: r.pass ? 'PASS' : 'FAIL',
          Policy: r.policy || '',
          Message: r.message || '',
          Recommendation: r.recommendation || '',
          Spec: r.spec,
        });
      });
    });
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deliverability-checklist.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('Deliverability Checklist', 10, 10);
    const domains = Object.keys(results).filter((d) => !results[d].error);
    let y = 20;
    doc.text('Control', 10, y);
    domains.forEach((d, i) => {
      doc.text(d, 40 + i * 40, y);
    });
    y += 10;
    CONTROLS.forEach(({ id, label }) => {
      doc.text(label, 10, y);
      domains.forEach((d, i) => {
        const r = (results[d] as any)[id as ControlId] as Result;
        const text = r.pass ? 'PASS' : 'FAIL';
        doc.text(text, 40 + i * 40, y);
        if (r.spec) {
          doc.textWithLink('Fix', 40 + i * 40, y + 5, { url: r.spec });
        }
      });
      y += 20;
    });
    doc.save('deliverability-checklist.pdf');
  };


  const hasResults = Object.keys(results).length > 0;

  const DMARC_TEMPLATES = [
    {
      label: 'Monitor',
      value: 'v=DMARC1; p=none; rua=mailto:postmaster@domain.com',
    },
    {
      label: 'Quarantine',
      value:
        'v=DMARC1; p=quarantine; rua=mailto:postmaster@domain.com; aspf=s; adkim=s',
    },
    {
      label: 'Reject',
      value:
        'v=DMARC1; p=reject; rua=mailto:postmaster@domain.com; aspf=s; adkim=s',
    },
  ];

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          rows={3}
          placeholder={"domain.com\nexample.org"}
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
        />
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="DKIM selector (optional)"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
        />
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {hasResults && (
        <>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Control</th>
                  {Object.keys(results).map((domain) => (
                    <th key={domain} className="pb-2">
                      {domain}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map(({ id, label }) => (
                  <tr key={id} className="border-t border-gray-700">
                    <td className="py-2 font-semibold">{label}</td>
                    {Object.entries(results).map(([domain, res]) => {
                      if (res.error) {
                        return (
                          <td key={domain} className="py-2 text-xs text-red-400">
                            {res.error}
                          </td>
                        );
                      }
                      const r = (res as any)[id as ControlId] as Result;
                      const badgeColor = r.pass ? 'bg-green-600' : 'bg-red-600';
                      const tip = [r.record, r.message].filter(Boolean).join('\n');
                      return (
                        <td key={domain} className="py-2">
                          <div className="flex flex-col">
                            <span
                              className={`px-2 py-0.5 rounded text-white text-xs ${badgeColor}`}
                              title={tip}
                            >
                              {r.pass ? 'PASS' : 'FAIL'}
                            </span>
                            {(!r.pass && (r.message || r.recommendation)) && (
                              <div className="mt-1 text-xs text-red-400 space-y-1">
                                {r.message && <div>{r.message}</div>}
                                {r.recommendation && <div>{r.recommendation}</div>}
                              </div>
                            )}
                            {(r.record || r.example) && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    r.record || r.example || ''
                                  )
                                }
                                className="mt-1 text-xs underline text-blue-400 self-start"
                              >
                                Copy
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="font-semibold">DMARC Templates</div>
            {DMARC_TEMPLATES.map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <code className="bg-gray-800 px-2 py-1 rounded flex-1">{t.value}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(t.value)}
                  className="px-2 py-1 bg-gray-700 rounded"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={exportCsv}
              className="px-4 py-1 bg-green-600 rounded"
              type="button"
            >
              Export Checklist CSV
            </button>
            <button
              onClick={exportPdf}
              className="px-4 py-1 bg-purple-600 rounded"
              type="button"
            >
              Export Checklist PDF
            </button>
          </div>
        </>

          
          
      )}
    </div>
  );
};

export default MailAuth;
