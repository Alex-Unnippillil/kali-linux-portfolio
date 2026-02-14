export interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

export interface NiktoReportTarget {
  host: string;
  port?: string;
  ssl: boolean;
  url: string;
}

export interface NiktoReportMetadata {
  target: NiktoReportTarget;
  command: string;
  generatedAt: string;
}

const DEFAULT_SEVERITY_KEY = 'Other';

const severityDisplay = {
  Critical: {
    label: 'Critical',
    color: '#ef4444',
    description: 'Immediate remediation required. Exploitation is likely or underway.',
  },
  High: {
    label: 'High',
    color: '#f97316',
    description: 'Significant risk. Prioritize mitigation in the next maintenance window.',
  },
  Medium: {
    label: 'Medium',
    color: '#facc15',
    description: 'Review and remediate. Conditions may be required to exploit.',
  },
  Low: {
    label: 'Low',
    color: '#2dd4bf',
    description: 'Minor exposure. Track for later remediation or compensating controls.',
  },
  Info: {
    label: 'Informational',
    color: '#60a5fa',
    description: 'General information about the host or configuration.',
  },
} as const;

type SeverityKey = keyof typeof severityDisplay | typeof DEFAULT_SEVERITY_KEY;

type LegendEntry = {
  key: SeverityKey;
  label: string;
  color: string;
  description: string;
};

const legendOrder: LegendEntry[] = (
  ['Critical', 'High', 'Medium', 'Low', 'Info'] as Array<keyof typeof severityDisplay>
).map((key) => ({
  key,
  label: severityDisplay[key].label,
  color: severityDisplay[key].color,
  description: severityDisplay[key].description,
}));

legendOrder.push({
  key: DEFAULT_SEVERITY_KEY,
  label: 'Other',
  color: '#94a3b8',
  description: 'Findings that do not map to a standard Nikto severity.',
});

const severityOrder: SeverityKey[] = ['Critical', 'High', 'Medium', 'Low', 'Info', DEFAULT_SEVERITY_KEY];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normaliseSeverity = (severity: string): SeverityKey => {
  if (severityDisplay[severity as keyof typeof severityDisplay]) {
    return severity as keyof typeof severityDisplay;
  }
  const normalised = severity.trim().toLowerCase();
  const match = (Object.keys(severityDisplay) as Array<keyof typeof severityDisplay>).find(
    (key) => key.toLowerCase() === normalised
  );
  return match ?? DEFAULT_SEVERITY_KEY;
};

const formatLegend = (): string =>
  `<ul class="legend">${legendOrder
    .map(
      (entry) =>
        `<li class="legend-item"><span class="swatch severity-${entry.key.toLowerCase()}"></span><span class="legend-label">${entry.label}</span><span class="legend-description">${entry.description}</span></li>`
    )
    .join('')}</ul>`;

const formatReferenceList = (references: string[]): string => {
  if (!references.length) {
    return '<p class="finding-references">No references provided.</p>';
  }
  return `<ul class="finding-references">${references
    .map((ref) => `<li>${escapeHtml(ref)}</li>`)
    .join('')}</ul>`;
};

const formatFinding = (finding: NiktoFinding): string => {
  const severityKey = normaliseSeverity(finding.severity);
  return `<li class="finding severity-${severityKey.toLowerCase()}">
    <div class="finding-header">
      <h4>${escapeHtml(finding.path)}</h4>
      <span class="badge">${escapeHtml(finding.severity)}</span>
    </div>
    <p class="finding-summary">${escapeHtml(finding.finding)}</p>
    <div class="finding-details">${escapeHtml(finding.details)}</div>
    ${formatReferenceList(finding.references)}
  </li>`;
};

const formatSeveritySection = (severity: SeverityKey, findings: NiktoFinding[], index: number): string => {
  const label = severityDisplay[severity as keyof typeof severityDisplay]?.label ?? 'Other';
  const openAttribute = index === 0 ? ' open' : '';
  const findingsMarkup = findings.map(formatFinding).join('');
  return `<details class="severity-group severity-${severity.toLowerCase()}"${openAttribute}>
    <summary>
      <span class="summary-label">${label}</span>
      <span class="summary-count">${findings.length} finding${findings.length === 1 ? '' : 's'}</span>
    </summary>
    <ul class="finding-list">${findingsMarkup}</ul>
  </details>`;
};

const formatSections = (grouped: Map<SeverityKey, NiktoFinding[]>): string => {
  const sections = severityOrder
    .filter((severity) => grouped.get(severity)?.length)
    .map((severity, index) => formatSeveritySection(severity, grouped.get(severity) ?? [], index))
    .join('');
  if (sections) {
    return sections;
  }
  return '<p class="empty">No findings were provided for this report.</p>';
};

const groupFindingsBySeverity = (findings: NiktoFinding[]): Map<SeverityKey, NiktoFinding[]> => {
  const grouped = new Map<SeverityKey, NiktoFinding[]>();
  findings.forEach((finding) => {
    const severityKey = normaliseSeverity(finding.severity);
    const list = grouped.get(severityKey) ?? [];
    list.push(finding);
    grouped.set(severityKey, list);
  });
  return grouped;
};

const computeTotals = (findings: NiktoFinding[]): Record<string, number> => {
  return findings.reduce<Record<string, number>>((acc, finding) => {
    const severityKey = normaliseSeverity(finding.severity);
    acc[severityKey] = (acc[severityKey] ?? 0) + 1;
    return acc;
  }, {});
};

export const generateNiktoHtmlReport = (
  findings: NiktoFinding[],
  metadata: NiktoReportMetadata
): string => {
  const grouped = groupFindingsBySeverity(findings);
  const totalFindings = findings.length;
  const formattedLegend = formatLegend();
  const sections = formatSections(grouped);
  const portLine = metadata.target.port
    ? `<div><span class="label">Port:</span> ${escapeHtml(metadata.target.port)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Nikto Simulation Report for ${escapeHtml(metadata.target.host)}</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { font-size: 20px; margin: 32px 0 12px; }
    h4 { margin: 0; font-size: 16px; }
    code { background: rgba(15, 23, 42, 0.6); padding: 4px 6px; border-radius: 4px; font-size: 14px; color: #f97316; }
    .report-header { background: rgba(15, 23, 42, 0.85); border: 1px solid #1e293b; border-radius: 12px; padding: 24px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.45); }
    .metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; font-size: 14px; }
    .label { font-weight: 600; color: #cbd5f5; margin-right: 6px; text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
    .legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; list-style: none; padding: 0; margin: 12px 0 0; }
    .legend-item { display: flex; flex-direction: column; padding: 12px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(30, 41, 59, 0.6); }
    .swatch { width: 100%; height: 4px; border-radius: 999px; margin-bottom: 8px; display: block; }
    .legend-label { font-weight: 600; font-size: 14px; }
    .legend-description { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .results { margin-top: 24px; display: grid; gap: 16px; }
    details.severity-group { border-radius: 10px; border: 1px solid #1e293b; background: rgba(30, 41, 59, 0.6); overflow: hidden; }
    details summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; font-weight: 600; font-size: 16px; }
    details summary::-webkit-details-marker { display: none; }
    .summary-count { background: rgba(148, 163, 184, 0.2); padding: 4px 8px; border-radius: 999px; font-size: 12px; }
    .finding-list { margin: 0; padding: 16px; list-style: none; display: grid; gap: 16px; }
    .finding { border-radius: 10px; padding: 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); }
    .finding-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
    .badge { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.25); }
    .finding-summary { margin: 0 0 8px; font-size: 14px; }
    .finding-details { font-size: 13px; opacity: 0.85; margin-bottom: 8px; }
    .finding-references { margin: 0; padding-left: 20px; font-size: 12px; }
    .finding-references li { margin-bottom: 4px; }
    .empty { font-style: italic; opacity: 0.7; }
    .severity-critical .badge, .severity-critical .swatch { background: ${severityDisplay.Critical.color}; }
    .severity-high .badge, .severity-high .swatch { background: ${severityDisplay.High.color}; }
    .severity-medium .badge, .severity-medium .swatch { background: ${severityDisplay.Medium.color}; color: #1f2937; }
    .severity-low .badge, .severity-low .swatch { background: ${severityDisplay.Low.color}; color: #0f172a; }
    .severity-info .badge, .severity-info .swatch { background: ${severityDisplay.Info.color}; }
    .severity-${DEFAULT_SEVERITY_KEY.toLowerCase()} .badge, .severity-${DEFAULT_SEVERITY_KEY.toLowerCase()} .swatch { background: #94a3b8; }
    footer { margin-top: 32px; font-size: 12px; opacity: 0.7; }
  </style>
</head>
<body>
  <header class="report-header">
    <h1>Nikto Simulation Report</h1>
    <p>This export is generated from static lab data. It does not represent a live penetration test.</p>
    <div class="metadata-grid">
      <div><span class="label">Generated</span> <time datetime="${escapeHtml(
        metadata.generatedAt
      )}">${escapeHtml(metadata.generatedAt)}</time></div>
      <div><span class="label">Target URL</span> ${escapeHtml(metadata.target.url)}</div>
      <div><span class="label">Host</span> ${escapeHtml(metadata.target.host)}</div>
      ${portLine}
      <div><span class="label">SSL</span> ${metadata.target.ssl ? 'Enabled' : 'Disabled'}</div>
      <div><span class="label">Command</span> <code>${escapeHtml(metadata.command)}</code></div>
      <div><span class="label">Total Findings</span> ${totalFindings}</div>
    </div>
  </header>
  <section>
    <h2>Legend</h2>
    ${formattedLegend}
  </section>
  <section class="results">
    <h2>Findings</h2>
    ${sections}
  </section>
  <footer>Report generated for simulation and training purposes only.</footer>
</body>
</html>`;
};

export const generateNiktoJsonReport = (
  findings: NiktoFinding[],
  metadata: NiktoReportMetadata
): string => {
  const totals = computeTotals(findings);
  const payload = {
    metadata: {
      target: {
        host: metadata.target.host,
        port: metadata.target.port,
        ssl: metadata.target.ssl,
        url: metadata.target.url,
      },
      command: metadata.command,
      generatedAt: metadata.generatedAt,
    },
    totals,
    findings: findings.map((finding) => ({
      path: finding.path,
      finding: finding.finding,
      references: [...finding.references],
      severity: finding.severity,
      details: finding.details,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
};
