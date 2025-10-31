import { expect, Page, TestInfo } from '@playwright/test';
import AxeBuilder, { AxeResults, Result } from '@axe-core/playwright';
import { promises as fs } from 'fs';

export type ImpactLevel = NonNullable<Result['impact']>;

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa'] as const;
const DEFAULT_THRESHOLDS: Record<ImpactLevel, number> = {
  critical: 0,
  serious: 0,
  moderate: 10,
  minor: 50,
};

const IMPACT_ORDER: ImpactLevel[] = ['critical', 'serious', 'moderate', 'minor'];

export interface AxeRunOptions {
  /**
   * Human readable label used for attachments and assertion messaging.
   */
  label: string;
  /**
   * CSS selectors passed to axe.include to scope the analysis.
   */
  include?: string[];
  /**
   * CSS selectors passed to axe.exclude to omit sections of the page.
   */
  exclude?: string[];
  /**
   * Custom impact thresholds. Defaults fall back to the baseline map.
   */
  thresholds?: Partial<Record<ImpactLevel, number>>;
  /**
   * Axe tags to filter the rule set.
   */
  tags?: string[];
}

interface AxeSummary {
  counts: Partial<Record<ImpactLevel, number>>;
  hasViolations: boolean;
}

const sanitizeLabel = (label: string): string =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'axe-report';

const summariseViolations = (results: AxeResults): AxeSummary => {
  const counts: Partial<Record<ImpactLevel, number>> = {};
  for (const violation of results.violations) {
    const impact = violation.impact ?? 'minor';
    counts[impact] = (counts[impact] || 0) + 1;
  }

  return {
    counts,
    hasViolations: results.violations.length > 0,
  };
};

const buildMarkdownReport = (label: string, results: AxeResults, summary: AxeSummary): string => {
  const lines: string[] = [];
  lines.push(`# Accessibility report: ${label}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Impact | Violations |');
  lines.push('| ------ | ---------- |');
  for (const impact of IMPACT_ORDER) {
    const count = summary.counts[impact] ?? 0;
    lines.push(`| ${impact} | ${count} |`);
  }

  if (!summary.hasViolations) {
    lines.push('');
    lines.push('No violations detected. ✅');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('## Violations');
  lines.push('');

  for (const violation of results.violations) {
    const impact = violation.impact ?? 'minor';
    lines.push(`### [${impact}] ${violation.id}`);
    lines.push('');
    lines.push(`* **Description:** ${violation.description}`);
    lines.push(`* **Help:** [${violation.help}](${violation.helpUrl})`);
    if (violation.nodes.length) {
      lines.push('* **Nodes:**');
      violation.nodes.forEach((node) => {
        const targets = node.target.join(', ');
        lines.push(`  * ${targets}`);
        if (node.failureSummary) {
          lines.push(`    * ${node.failureSummary.replace(/\s+/g, ' ')}`);
        }
      });
    }
    lines.push('');
  }

  return lines.join('\n');
};

export const runAxeAudit = async (
  page: Page,
  testInfo: TestInfo,
  options: AxeRunOptions,
): Promise<AxeResults> => {
  const label = options.label;
  const slug = sanitizeLabel(label);
  const builder = new AxeBuilder({ page });

  const tags = options.tags?.length ? options.tags : DEFAULT_TAGS;
  builder.withTags(tags);

  for (const selector of options.include ?? []) {
    builder.include(selector);
  }

  for (const selector of options.exclude ?? []) {
    builder.exclude(selector);
  }

  const results = await builder.analyze();
  const summary = summariseViolations(results);

  const jsonPath = testInfo.outputPath(`${slug}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  await testInfo.attach(`${label} (axe json)`, {
    path: jsonPath,
    contentType: 'application/json',
  });

  const markdownPath = testInfo.outputPath(`${slug}.md`);
  await fs.writeFile(markdownPath, buildMarkdownReport(label, results, summary), 'utf-8');
  await testInfo.attach(`${label} (summary)`, {
    path: markdownPath,
    contentType: 'text/markdown',
  });

  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };

  for (const impact of IMPACT_ORDER) {
    const limit = thresholds[impact];
    if (typeof limit !== 'number') continue;
    const count = summary.counts[impact] ?? 0;
    expect(count, `${label} has ${count} ${impact} violations (allowed ${limit})`).toBeLessThanOrEqual(limit);
  }

  return results;
};

