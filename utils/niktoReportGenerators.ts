const severityDefinitions = {
  Critical: {
    color: '#b91c1c',
    description: 'Critical issues that require immediate attention.',
  },
  High: {
    color: '#c2410c',
    description: 'High risk findings that should be prioritized.',
  },
  Medium: {
    color: '#b45309',
    description: 'Medium risk findings that warrant investigation.',
  },
  Low: {
    color: '#1d4ed8',
    description: 'Low risk findings and hardening opportunities.',
  },
  Info: {
    color: '#4b5563',
    description: 'Informational observations about the target.',
  },
  Unclassified: {
    color: '#6b7280',
    description: 'Findings without an assigned severity.',
  },
} as const;

const severityOrder = [
  'Critical',
  'High',
  'Medium',
  'Low',
  'Info',
  'Unclassified',
] as const;

type SeverityName = (typeof severityOrder)[number];

const severityLookup: Record<string, SeverityName> = Object.fromEntries(
  severityOrder.map((label) => [label.toLowerCase(), label])
);

export interface NiktoFindingInput {
  path?: string;
  finding?: string;
  severity?: string;
  references?: string[];
  details?: string;
}

export interface NiktoFindingNormalized {
  path: string;
  finding: string;
  severity: SeverityName;
  originalSeverity?: string;
  references: string[];
  details: string;
}

export interface NiktoTargetInfo {
  host?: string;
  port?: string | number;
  protocol?: string;
}

export type NiktoReportFilters = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface NiktoReportMetadata {
  target?: NiktoTargetInfo;
  command?: string;
  filters?: NiktoReportFilters;
  generatedAt?: string;
  notes?: string;
}

export interface NiktoJsonReport {
  generatedAt: string;
  target: {
    host: string;
    port?: string | number;
    protocol?: string;
  };
  command?: string;
  filters?: Record<string, string>;
  notes?: string;
  summary: {
    totalFindings: number;
    severityCounts: Record<SeverityName, number>;
  };
  findings: NiktoFindingNormalized[];
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });

const normalizeSeverity = (value?: string): SeverityName => {
  if (!value) {
    return 'Info';
  }
  const label = severityLookup[value.toLowerCase()];
  if (label) {
    return label;
  }
  return 'Unclassified';
};

const normalizeTarget = (
  target?: NiktoTargetInfo
): { host: string; port?: string | number; protocol?: string } => {
  const host = target?.host?.trim();
  return {
    host: host && host.length > 0 ? host : 'unknown',
    port: target?.port,
    protocol: target?.protocol,
  };
};

const normalizeFilters = (
  filters?: NiktoReportFilters
): Record<string, string> | undefined => {
  if (!filters) return undefined;
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  });
  if (!entries.length) return undefined;
  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});
};

const sanitizeFinding = (finding: NiktoFindingInput): NiktoFindingNormalized => {
  const normalizedSeverity = normalizeSeverity(finding.severity);
  const normalized: NiktoFindingNormalized = {
    path: finding.path ? String(finding.path) : 'unknown',
    finding: finding.finding ? String(finding.finding) : 'No finding description provided.',
    severity: normalizedSeverity,
    references: Array.isArray(finding.references)
      ? finding.references.map((ref) => String(ref))
      : [],
    details: finding.details ? String(finding.details) : 'No additional details provided.',
  };
  const originalSeverity = finding.severity && finding.severity.trim();
  if (originalSeverity && originalSeverity !== normalizedSeverity) {
    normalized.originalSeverity = originalSeverity;
  }
  return normalized;
};

const buildLegend = (): string => {
  const legendItems = severityOrder
    .map((label) => {
      const definition = severityDefinitions[label];
      return `
        <li class="legend-item">
          <span class="legend-swatch" style="background:${definition.color}"></span>
          <div class="legend-copy">
            <span class="legend-label">${label}</span>
            <span class="legend-description">${definition.description}</span>
          </div>
        </li>
      `;
    })
    .join('');
  return `
    <section class="legend">
      <h2>Severity legend</h2>
      <ul>${legendItems}</ul>
    </section>
  `;
};

const buildFindingList = (findings: NiktoFindingNormalized[]): string => {
  if (!findings.length) {
    return '<p class="empty">No findings recorded for this section.</p>';
  }
  return `
    <table>
      <thead>
        <tr>
          <th scope="col">Path</th>
          <th scope="col">Finding</th>
          <th scope="col">References</th>
          <th scope="col">Details</th>
        </tr>
      </thead>
      <tbody>
        ${findings
          .map((finding) => {
            const references = finding.references.length
              ? finding.references
                  .map((ref) => `<li>${escapeHtml(ref)}</li>`)
                  .join('')
              : '<li>None</li>';
            return `
              <tr>
                <td>${escapeHtml(finding.path)}</td>
                <td>${escapeHtml(finding.finding)}</td>
                <td><ul>${references}</ul></td>
                <td>${escapeHtml(finding.details)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
};

const buildSeveritySections = (
  grouped: Record<SeverityName, NiktoFindingNormalized[]>
): string => {
  return severityOrder
    .map((severity) => {
      const list = grouped[severity] || [];
      const definition = severityDefinitions[severity];
      const openAttr = list.length ? ' open' : '';
      const countBadge = `<span class="badge">${list.length}</span>`;
      const originalSeverityHint = list.some((item) => item.originalSeverity)
        ? '<span class="variant">Includes remapped severities</span>'
        : '';
      return `
        <details class="severity"${openAttr}>
          <summary>
            <span class="indicator" style="background:${definition.color}"></span>
            <span class="label">${severity}</span>
            ${countBadge}
            ${originalSeverityHint}
          </summary>
          <div class="body">
            ${buildFindingList(list)}
          </div>
        </details>
      `;
    })
    .join('');
};

const formatTargetUrl = (target: {
  host: string;
  port?: string | number;
  protocol?: string;
}): string => {
  const protocol = target.protocol
    ? target.protocol.replace(/:\/\/$/, '').replace(/:$/, '')
    : 'http';
  const port =
    target.port !== undefined && target.port !== '' ? `:${String(target.port)}` : '';
  return `${protocol}://${target.host}${port}`;
};

const buildMetadataSection = (
  target: { host: string; port?: string | number; protocol?: string },
  generatedAt: string,
  command?: string,
  filters?: Record<string, string>,
  notes?: string
): string => {
  const rows = [
    `<dt>Target</dt><dd>${escapeHtml(formatTargetUrl(target))}</dd>`,
    `<dt>Generated</dt><dd>${escapeHtml(generatedAt)}</dd>`,
  ];
  if (command) {
    rows.push(`<dt>Command</dt><dd><code>${escapeHtml(command)}</code></dd>`);
  }
  if (filters && Object.keys(filters).length > 0) {
    rows.push(
      `<dt>Filters</dt><dd>${escapeHtml(
        Object.entries(filters)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      )}</dd>`
    );
  }
  if (notes) {
    rows.push(`<dt>Notes</dt><dd>${escapeHtml(notes)}</dd>`);
  }
  return `
    <section class="metadata">
      <h2>Scan metadata</h2>
      <dl>${rows.join('')}</dl>
    </section>
  `;
};

const htmlSkeleton = (
  body: string,
  styles: string
): string => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nikto Scan Report</title>
    <style>${styles}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;

const baseStyles = `
  :root {
    color-scheme: dark;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f172a;
    color: #f8fafc;
  }
  body {
    margin: 0;
    padding: 2rem;
    display: grid;
    gap: 2rem;
  }
  h1 {
    margin: 0;
    font-size: 2rem;
  }
  h2 {
    margin-bottom: 0.75rem;
    font-size: 1.25rem;
  }
  section {
    background: #111827;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
  }
  .legend ul {
    display: grid;
    gap: 0.75rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .legend-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
  }
  .legend-swatch {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }
  .legend-label {
    font-weight: 600;
    display: block;
  }
  .legend-description {
    font-size: 0.85rem;
    color: rgba(226, 232, 240, 0.7);
  }
  .legend-copy {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .metadata dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.5rem 1rem;
    margin: 0;
  }
  .metadata dt {
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
  }
  .metadata dd {
    margin: 0;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, SFMono, Menlo,
      Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }
  details.severity {
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: border-color 0.2s ease, transform 0.2s ease;
    background: rgba(17, 24, 39, 0.85);
  }
  details.severity + details.severity {
    margin-top: 1rem;
  }
  details.severity[open] {
    border-color: rgba(59, 130, 246, 0.35);
    transform: translateY(-1px);
  }
  details summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    font-weight: 600;
    background: rgba(30, 41, 59, 0.75);
  }
  details summary::-webkit-details-marker {
    display: none;
  }
  .indicator {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
  }
  .badge {
    margin-left: auto;
    background: rgba(59, 130, 246, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .variant {
    font-size: 0.75rem;
    color: rgba(148, 163, 184, 0.75);
  }
  .body {
    padding: 1.25rem;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  th,
  td {
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    padding: 0.75rem;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.75);
  }
  td ul {
    margin: 0;
    padding-left: 1rem;
  }
  .empty {
    margin: 0;
    color: rgba(148, 163, 184, 0.7);
    font-style: italic;
  }
  footer {
    color: rgba(148, 163, 184, 0.6);
    font-size: 0.75rem;
    text-align: center;
  }
`;

export const generateNiktoHtmlReport = (
  findings: NiktoFindingInput[],
  metadata: NiktoReportMetadata = {}
): string => {
  const normalizedTarget = normalizeTarget(metadata.target);
  const filters = normalizeFilters(metadata.filters);
  const generatedAt = metadata.generatedAt || new Date().toISOString();
  const normalizedFindings = Array.isArray(findings)
    ? findings.map(sanitizeFinding)
    : [];
  const grouped = normalizedFindings.reduce<Record<SeverityName, NiktoFindingNormalized[]>>(
    (acc, finding) => {
      const severity = finding.severity;
      acc[severity] = acc[severity] || [];
      acc[severity].push(finding);
      return acc;
    },
    {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
      Info: [],
      Unclassified: [],
    }
  );

  const header = `
    <header>
      <h1>Nikto scan report</h1>
      <p class="subtitle">Offline export for training and documentation.</p>
    </header>
  `;

  const body = `
    ${header}
    ${buildMetadataSection(
      normalizedTarget,
      generatedAt,
      metadata.command,
      filters,
      metadata.notes
    )}
    ${buildLegend()}
    <section class="findings">
      <h2>Findings by severity</h2>
      ${buildSeveritySections(grouped)}
    </section>
    <footer>Generated by the Kali Linux Portfolio Nikto simulator.</footer>
  `;

  return htmlSkeleton(body, baseStyles);
};

export const generateNiktoJsonReport = (
  findings: NiktoFindingInput[],
  metadata: NiktoReportMetadata = {}
): NiktoJsonReport => {
  const normalizedTarget = normalizeTarget(metadata.target);
  const filters = normalizeFilters(metadata.filters);
  const generatedAt = metadata.generatedAt || new Date().toISOString();
  const normalizedFindings = Array.isArray(findings)
    ? findings.map(sanitizeFinding)
    : [];

  const severityCounts = severityOrder.reduce<Record<SeverityName, number>>((acc, severity) => {
    acc[severity] = 0;
    return acc;
  }, {} as Record<SeverityName, number>);

  normalizedFindings.forEach((finding) => {
    severityCounts[finding.severity] += 1;
  });

  return {
    generatedAt,
    target: normalizedTarget,
    command: metadata.command,
    filters,
    notes: metadata.notes,
    summary: {
      totalFindings: normalizedFindings.length,
      severityCounts,
    },
    findings: normalizedFindings,
  };
};

export type { SeverityName };
