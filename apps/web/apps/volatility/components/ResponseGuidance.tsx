import React from 'react';

type Severity = 'informational' | 'suspicious' | 'malicious';

type TimelineEntry = {
  time: string;
  title: string;
  detail: string;
  severity: Severity;
};

type MitigationStep = {
  title: string;
  detail: string;
  severity: Severity;
};

const severityTokens: Record<Severity, string> = {
  informational: 'border-sky-500/60 bg-sky-950/40 text-sky-100',
  suspicious: 'border-amber-500/70 bg-amber-950/40 text-amber-100',
  malicious: 'border-rose-500/80 bg-rose-950/50 text-rose-100 shadow-lg shadow-rose-900/30',
};

const timeline: TimelineEntry[] = [
  {
    time: '08:29',
    title: 'Injected region flagged',
    detail:
      'malfind located RWX memory tied to PID 612 (csrss.exe), suggesting process hollowing.',
    severity: 'malicious',
  },
  {
    time: '08:24',
    title: 'Encoded payload identified',
    detail:
      'yarascan hit on rule "EncodedPayload" for PID 248 and surfaces suspicious API usage.',
    severity: 'suspicious',
  },
  {
    time: '08:17',
    title: 'Hidden listener discovered',
    detail:
      'netscan shows SMB session from 192.168.1.5:445 to 192.168.1.10:51234 with no matching service.',
    severity: 'suspicious',
  },
];

const mitigation: MitigationStep[] = [
  {
    title: 'Quarantine impacted services',
    detail: 'Suspend PID 612 and preserve memory capture before containment.',
    severity: 'malicious',
  },
  {
    title: 'Block anomalous egress',
    detail: 'Temporarily deny outbound SMB from 192.168.1.5 while triage completes.',
    severity: 'suspicious',
  },
  {
    title: 'Audit persistence mechanisms',
    detail:
      'Review autostart locations for smss.exe descendants and unsigned DLL injections.',
    severity: 'informational',
  },
];

const ResponseGuidance: React.FC = () => {
  return (
    <div className="bg-gray-950/70 text-white rounded-xl border border-gray-800 shadow-inner divide-y divide-gray-900">
      <section className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200">
            Incident timeline
          </h2>
          <span className="text-[10px] uppercase text-gray-500">Simulated</span>
        </div>
        <ol className="space-y-3">
          {timeline.map((event) => (
            <li
              key={`${event.time}-${event.title}`}
              className={`rounded-lg border-l-4 px-3 py-2 transition-shadow duration-200 ${
                severityTokens[event.severity]
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>{event.time}</span>
                <span className="capitalize">{event.severity}</span>
              </div>
              <p className="mt-1 text-xs font-semibold">{event.title}</p>
              <p className="text-[11px] text-gray-200/80">{event.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200">
            Mitigation notes
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-[11px] font-medium text-gray-200 transition hover:border-gray-500 hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h16v4H4z" />
              <path d="M12 12h8" />
              <path d="M12 16h8" />
              <path d="M4 8v12h8" />
            </svg>
            Export notes
          </button>
        </div>
        <ul className="space-y-3">
          {mitigation.map((step) => (
            <li
              key={step.title}
              className={`rounded-lg border-l-4 px-3 py-2 text-[11px] transition-shadow duration-200 ${
                severityTokens[step.severity]
              }`}
            >
              <p className="text-xs font-semibold">{step.title}</p>
              <p className="text-gray-200/80">{step.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ResponseGuidance;
