import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

import { listQuarantinedTests } from '../flaky-tests';

export type FlakyReporterOptions = {
  /** Directory where generated summaries are stored. */
  outputDir?: string;
  /** File name prefix for weekly reports. */
  reportPrefix?: string;
};

const DEFAULT_OUTPUT_DIR = 'playwright-artifacts';
const DEFAULT_PREFIX = 'flaky-summary';

function isoWeekKey(date: Date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Shift to nearest Thursday: current date + 4 - current day number (Monday is 1, Sunday is 7).
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

type FlakyEntry = {
  title: string;
  file: string;
  status: TestResult['status'];
  reason?: string;
  ticket?: string;
};

export default class FlakyReporter implements Reporter {
  private readonly options: Required<FlakyReporterOptions>;
  private readonly quarantined: FlakyEntry[] = [];

  constructor(options: FlakyReporterOptions = {}) {
    this.options = {
      outputDir: options.outputDir ?? DEFAULT_OUTPUT_DIR,
      reportPrefix: options.reportPrefix ?? DEFAULT_PREFIX,
    };
  }

  onBegin(_config: FullConfig, _suite: Suite) {
    const quarantined = listQuarantinedTests();
    if (quarantined.length) {
      const manifest = quarantined
        .map((entry) => `- ${entry.titlePattern.toString()} — ${entry.reason}${entry.ticket ? ` (${entry.ticket})` : ''}`)
        .join('\n');
      const manifestPath = path.join(this.options.outputDir, 'quarantine-manifest.md');
      fs.mkdirSync(this.options.outputDir, { recursive: true });
      fs.writeFileSync(
        manifestPath,
        `# Quarantined tests\n\nThe following patterns are skipped unless \`RUN_QUARANTINED=true\` is provided.\n\n${manifest}\n`
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const quarantineAnnotation = test.annotations.find((annotation) => annotation.type === 'quarantined');
    if (quarantineAnnotation) {
      const tracking = test.annotations.find((annotation) => annotation.type === 'tracking');
      this.quarantined.push({
        title: test.title,
        file: test.location.file,
        status: result.status,
        reason: quarantineAnnotation.description,
        ticket: tracking?.description,
      });
    }
  }

  async onEnd(result: FullResult) {
    if (!this.quarantined.length) {
      return;
    }

    const now = new Date();
    const weekKey = isoWeekKey(now);
    const outputDir = this.options.outputDir;
    const reportPath = path.join(outputDir, `${this.options.reportPrefix}-${weekKey}.md`);
    fs.mkdirSync(outputDir, { recursive: true });
    const lines = [
      `# Flaky test summary — ${weekKey}`,
      '',
      `Generated on ${now.toISOString()} from a run that finished with status: ${result.status}.`,
      '',
      `Total quarantined executions: ${this.quarantined.length}.`,
      '',
      '| Test | File | Status | Reason | Tracking |',
      '| ---- | ---- | ------ | ------ | -------- |',
      ...this.quarantined.map((entry) =>
        `| ${entry.title.replace(/\|/g, '\\|')} | ${entry.file.replace(/\|/g, '\\|')} | ${entry.status} | ${
          entry.reason?.replace(/\|/g, '\\|') ?? ''
        } | ${entry.ticket?.replace(/\|/g, '\\|') ?? ''} |`
      ),
    ];
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  }
}
