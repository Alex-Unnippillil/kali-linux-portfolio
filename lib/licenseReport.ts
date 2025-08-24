import {
  getLicenseInfo,
  matchLicense,
  parseSpdxExpression,
  detectLicenseConflicts,
  LicenseInfo,
  LicenseMatchResult,
  LicenseConflict,
} from './licenseMatcher';

export interface FileReport {
  file: string;
  detected: LicenseInfo[];
  fuzzy: LicenseMatchResult;
}

export interface LicenseReport {
  files: FileReport[];
  conflicts: LicenseConflict[];
}

/**
 * Analyze multiple files and generate a license report.
 * Input is an object mapping file paths to their text contents.
 */
export function generateLicenseReport(files: Record<string, string>): LicenseReport {
  const reports: FileReport[] = [];
  const allIds: Set<string> = new Set();

  for (const [file, text] of Object.entries(files)) {
    const parsed = parseSpdxExpression(text);
    const detected = parsed.ids.map((id) => getLicenseInfo(id));
    const fuzzy = matchLicense(text);
    reports.push({ file, detected, fuzzy });
    for (const id of parsed.ids) allIds.add(id);
  }

  const conflicts = detectLicenseConflicts(Array.from(allIds), true);
  return { files: reports, conflicts };
}

