import React, { useMemo } from 'react';
import copyToClipboard from '../../../utils/clipboard';
import type { Artifact } from '../types';

type ChecklistKey = 'headings' | 'imageAlt' | 'tableStructure';

interface ChecklistDefinition {
  key: ChecklistKey;
  label: string;
  remediation: string;
}

interface ChecklistResult extends ChecklistDefinition {
  passed: boolean;
  warning?: string;
}

interface ReportExportProps {
  caseName?: string;
  artifacts: Artifact[];
}

const CHECKLIST: ChecklistDefinition[] = [
  {
    key: 'headings',
    label: 'Headings follow a logical order',
    remediation:
      'Adjust the section heading levels so they increase one level at a time without skipping.',
  },
  {
    key: 'imageAlt',
    label: 'Images include descriptive alt text',
    remediation:
      'Provide meaningful alt text for each artifact screenshot or mark decorative images with an empty alt attribute.',
  },
  {
    key: 'tableStructure',
    label: 'Summary tables expose captions and scoped headers',
    remediation:
      'Confirm the builder includes a <caption> and scope="col" on header cells so screen readers announce the table correctly.',
  },
];

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clampHeadingLevel = (level?: number) => {
  if (typeof level !== 'number' || Number.isNaN(level)) return 3;
  return Math.min(Math.max(Math.round(level), 2), 6);
};

const buildArtifactSection = (artifact: Artifact, index: number) => {
  const headingLevel = clampHeadingLevel(artifact.headingLevel);
  const headingTag = `h${headingLevel}`;
  const image = artifact.evidenceImage
    ? `<figure>
        <img src="${escapeHtml(artifact.evidenceImage.src)}" alt="${escapeHtml(
        artifact.evidenceImage.alt ?? ''
      )}" />
        ${
          artifact.evidenceImage.caption
            ? `<figcaption>${escapeHtml(artifact.evidenceImage.caption)}</figcaption>`
            : ''
        }
      </figure>`
    : '';
  return `<section aria-labelledby="artifact-${index}">
    <${headingTag} id="artifact-${index}">${escapeHtml(artifact.name)}</${headingTag}>
    <dl>
      <dt>Type</dt>
      <dd>${escapeHtml(artifact.type)}</dd>
      <dt>Description</dt>
      <dd>${escapeHtml(artifact.description)}</dd>
      <dt>Plugin</dt>
      <dd>${escapeHtml(artifact.plugin)}</dd>
      <dt>Size (bytes)</dt>
      <dd>${artifact.size}</dd>
      <dt>Timestamp</dt>
      <dd>${escapeHtml(artifact.timestamp)}</dd>
      ${artifact.user ? `<dt>Owner</dt><dd>${escapeHtml(artifact.user)}</dd>` : ''}
    </dl>
    ${artifact.notes ? `<p>${escapeHtml(artifact.notes)}</p>` : ''}
    ${image}
  </section>`;
};

export const generateHtmlReport = (caseName: string, artifacts: Artifact[]) => {
  const summaryRows = artifacts
    .map(
      (a) =>
        `<tr>
          <td>${escapeHtml(a.name)}</td>
          <td>${escapeHtml(a.type)}</td>
          <td>${escapeHtml(a.description)}</td>
          <td>${a.size}</td>
          <td>${escapeHtml(a.plugin)}</td>
          <td>${escapeHtml(a.timestamp)}</td>
        </tr>`
    )
    .join('');

  const artifactSections = artifacts
    .map((artifact, index) => buildArtifactSection(artifact, index))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(caseName)} Report</title>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(caseName)}</h1>
        <p>Generated report summarising ${artifacts.length} artifact${
    artifacts.length === 1 ? '' : 's'
  }.</p>
      </header>
      <section aria-labelledby="artifact-summary-heading">
        <h2 id="artifact-summary-heading">Artifact summary</h2>
        <table>
          <caption>Artifact overview for ${escapeHtml(caseName)}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Description</th>
              <th scope="col">Size</th>
              <th scope="col">Plugin</th>
              <th scope="col">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>
      </section>
      ${artifactSections}
    </main>
  </body>
</html>`;
};

const evaluateAccessibility = (html: string) => {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return {
      warnings: [] as string[],
      checklist: CHECKLIST.map((item) => ({ ...item, passed: true } as ChecklistResult)),
    };
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const issues: Partial<Record<ChecklistKey, string>> = {};

  const headingElements = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  if (headingElements.length === 0) {
    issues.headings =
      'No headings were detected. Add at least one heading to describe the report structure.';
  } else {
    const [firstHeading] = headingElements;
    const firstLevel = Number(firstHeading.tagName.replace('H', ''));
    if (firstLevel !== 1) {
      issues.headings =
        'The first heading should be an <h1>. Update the report title level in the builder.';
    }
    let previousLevel = firstLevel;
    headingElements.slice(1).forEach((heading) => {
      const currentLevel = Number(heading.tagName.replace('H', ''));
      if (currentLevel - previousLevel > 1) {
        issues.headings =
          'Headings must increase one level at a time. Insert intermediate headings or lower the level.';
      }
      previousLevel = currentLevel;
    });
  }

  const images = Array.from(doc.body.querySelectorAll('img'));
  if (
    images.some(
      (img) => !img.hasAttribute('alt') || (img.getAttribute('alt') ?? '').trim().length === 0
    )
  ) {
    issues.imageAlt =
      'Images require descriptive alt text or an empty alt attribute when decorative.';
  }

  const table = doc.body.querySelector('table');
  if (table) {
    const caption = table.querySelector('caption');
    const headers = Array.from(table.querySelectorAll('th'));
    const hasScopedHeaders = headers.every((th) => th.getAttribute('scope') === 'col');
    if (!caption || !hasScopedHeaders) {
      issues.tableStructure =
        'Add a caption and scope="col" to table headers so assistive technologies can describe the grid.';
    }
  }

  const warnings = (Object.values(issues).filter(Boolean) as string[]).filter(
    (value, index, self) => self.indexOf(value) === index
  );

  const checklist: ChecklistResult[] = CHECKLIST.map((item) => ({
    ...item,
    passed: !issues[item.key],
    warning: issues[item.key],
  }));

  return { warnings, checklist };
};

const ReportExport: React.FC<ReportExportProps> = ({ caseName = 'case', artifacts }) => {
  const htmlReport = useMemo(() => generateHtmlReport(caseName, artifacts), [caseName, artifacts]);

  const accessibility = useMemo(() => evaluateAccessibility(htmlReport), [htmlReport]);

  const exportReport = () => {
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseName || 'case'}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyReport = () => {
    copyToClipboard(htmlReport);
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded bg-ub-cool-grey/60 p-3 text-xs text-white">
        <h3 className="mb-2 text-sm font-semibold">Accessibility checklist</h3>
        <ul className="space-y-2">
          {accessibility.checklist.map((item) => (
            <li key={item.key} className="rounded bg-black/30 p-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-2 w-2 rounded-full ${
                    item.passed ? 'bg-ub-green' : 'bg-ub-orange'
                  }`}
                />
                <span className="font-medium">{item.label}</span>
              </div>
              <p className="mt-1 text-gray-200">{item.remediation}</p>
              {!item.passed && item.warning && (
                <p className="mt-1 text-yellow-200">{item.warning}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
      {accessibility.warnings.length > 0 ? (
        <div
          role="alert"
          className="rounded border border-yellow-500 bg-yellow-500/20 px-3 py-2 text-xs text-yellow-100"
        >
          <p className="font-semibold">Resolve these issues before exporting:</p>
          <ul className="list-disc pl-4">
            {accessibility.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          role="status"
          className="rounded border border-green-600 bg-green-600/20 px-3 py-2 text-xs text-green-100"
        >
          Headings and alternative text checks passed. Review the checklist before sharing the
          report.
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={copyReport}
          className="bg-ub-gray px-3 py-1 text-sm text-black"
          type="button"
        >
          Copy HTML Report
        </button>
        <button
          onClick={exportReport}
          className="bg-ub-orange px-3 py-1 text-sm text-black"
          type="button"
        >
          Download HTML Report
        </button>
      </div>
    </div>
  );
};

export default ReportExport;
