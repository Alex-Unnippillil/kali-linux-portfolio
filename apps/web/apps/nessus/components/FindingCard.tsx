'use client';

import React from 'react';
import { Plugin, Severity } from '../types';

const severityStyles: Record<Severity, { border: string; chip: string }> = {
  Critical: {
    border: 'border-red-500/80 shadow-red-900/30',
    chip:
      'bg-red-500/20 text-red-200 ring-1 ring-inset ring-red-500/60 shadow-[0_0_10px_rgba(248,113,113,0.25)]',
  },
  High: {
    border: 'border-orange-400/70 shadow-orange-900/20',
    chip:
      'bg-orange-400/15 text-orange-200 ring-1 ring-inset ring-orange-400/50 shadow-[0_0_10px_rgba(251,146,60,0.18)]',
  },
  Medium: {
    border: 'border-amber-400/70 shadow-amber-900/10',
    chip:
      'bg-amber-400/10 text-amber-200 ring-1 ring-inset ring-amber-300/40 shadow-[0_0_8px_rgba(250,204,21,0.12)]',
  },
  Low: {
    border: 'border-emerald-400/70 shadow-emerald-900/10',
    chip:
      'bg-emerald-400/10 text-emerald-200 ring-1 ring-inset ring-emerald-300/40 shadow-[0_0_6px_rgba(52,211,153,0.12)]',
  },
  Info: {
    border: 'border-slate-500/60 shadow-slate-900/5',
    chip:
      'bg-slate-500/10 text-slate-200 ring-1 ring-inset ring-slate-400/40 shadow-[0_0_6px_rgba(148,163,184,0.1)]',
  },
};

const tagHints: Record<string, string> = {
  ssl: 'Renew the certificate or tighten expiry monitoring thresholds.',
  certificate: 'Schedule an accelerated certificate rotation to avoid outages.',
  auth: 'Force credential rotation and disable default accounts immediately.',
  crypto: 'Harden cipher suites and enforce modern key exchanges.',
  server: 'Plan a maintenance window to upgrade the affected services.',
  web: 'Apply vendor patches and refresh web stack packages.',
  info: 'Document the banner change in the next maintenance cycle.',
};

const severityFallback: Record<Severity, string> = {
  Critical: 'Treat as a break-glass priority—contain exposure and deploy hotfixes now.',
  High: 'Prioritise remediation in the current sprint and track progress daily.',
  Medium: 'Schedule remediation in the next maintenance window and monitor for drift.',
  Low: 'Bundle into routine hardening tasks and verify post-change baselines.',
  Info: 'Capture the context for awareness and decide if any action is required.',
};

interface Props {
  plugin: Plugin;
}

export default function FindingCard({ plugin }: Props) {
  const severityStyle = severityStyles[plugin.severity];
  const remediationTip =
    plugin.tags?.map((tag) => tagHints[tag])?.find(Boolean) ??
    severityFallback[plugin.severity];

  return (
    <article
      className={`group rounded-xl border-l-4 ${severityStyle.border} bg-slate-900/80 p-4 shadow-lg shadow-black/20 transition hover:bg-slate-900 hover:shadow-xl`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-slate-800/70 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-300">
            #{plugin.id}
          </span>
          <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
            {plugin.name}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${severityStyle.chip}`}
        >
          {plugin.severity}
        </span>
      </header>

      <dl className="mt-3 space-y-2 text-sm text-slate-300">
        {(plugin.cwe?.length || plugin.cve?.length) && (
          <div className="flex flex-wrap items-center gap-2">
            {plugin.cwe?.map((cwe) => (
              <span
                key={cwe}
                className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-slate-200"
              >
                CWE-{cwe}
              </span>
            ))}
            {plugin.cve?.map((cve) => (
              <span
                key={cve}
                className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-slate-200"
              >
                CVE-{cve}
              </span>
            ))}
          </div>
        )}
        {plugin.tags && plugin.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {plugin.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2.5 py-1 uppercase tracking-wide text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </dl>

      <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-900/90 p-3 text-sm text-slate-200 shadow-inner shadow-black/20">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Remediation next steps
        </h4>
        <p className="leading-relaxed text-slate-100">{remediationTip}</p>
      </div>
    </article>
  );
}
