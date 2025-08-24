import spdxLicenseIds from 'spdx-license-ids';
import licenseList from 'spdx-license-list/full';

export interface LicenseInfo {
  spdxId: string;
  url: string;
  compatibility: string;
  obligations: string;
}

export interface LicenseMatch extends LicenseInfo {
  confidence: number;
}

export interface LicenseMatchResult {
  matches: LicenseMatch[];
  ambiguous: boolean;
  message?: string;
}

const spdxIdSet = new Set(spdxLicenseIds.map(id => id.toUpperCase()));
const spdxCanonicalMap = new Map(spdxLicenseIds.map(id => [id.toUpperCase(), id]));

const TOKEN_REGEX = /\b[a-z0-9]+\b/g;

function tokenize(text: string): Set<string> {
  return new Set((text.toLowerCase().match(TOKEN_REGEX)) || []);
}

// Basic metadata for common licenses. Defaults are used if a license isn't listed.
const licenseMeta: Record<string, { compatibility: string; obligations: string }> = {
  'MIT': {
    compatibility: 'Permissive; compatible with most licenses',
    obligations: 'Include copyright and license notice',
  },
  'Apache-2.0': {
    compatibility: 'Permissive; GPLv3 compatible',
    obligations: 'Include NOTICE file and license',
  },
  'GPL-2.0-only': {
    compatibility: 'Strong copyleft',
    obligations: 'Disclose source and include license',
  },
  'GPL-3.0-only': {
    compatibility: 'Strong copyleft',
    obligations: 'Disclose source and include license',
  },
};

export function getLicenseInfo(spdxId: string): LicenseInfo {
  const meta = licenseMeta[spdxId] || {
    compatibility: 'Unknown',
    obligations: 'Refer to SPDX page for obligations',
  };
  return {
    spdxId,
    url: `https://spdx.org/licenses/${spdxId}.html`,
    ...meta,
  };
}

export function extractSpdxIds(text: string): string[] {
  const tokens = text.match(/[A-Za-z0-9-.+]+/g) || [];
  const ids = new Set<string>();
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (spdxIdSet.has(upper)) {
      ids.add(spdxCanonicalMap.get(upper) || upper);
    }
  }
  return Array.from(ids);
}

export interface ExpressionParseResult {
  ids: string[];
  hasAnd: boolean;
  hasOr: boolean;
}

export function parseSpdxExpression(text: string): ExpressionParseResult {
  const ids = extractSpdxIds(text);
  const hasAnd = /\bAND\b/i.test(text);
  const hasOr = /\bOR\b/i.test(text);
  return { ids, hasAnd, hasOr };
}

export interface LicenseConflict {
  licenses: [string, string];
  message: string;
  remediation: string;
}

const strongCopyleft = new Set(['GPL-2.0-only', 'GPL-3.0-only']);
const incompatiblePairs: Record<string, string[]> = {
  'GPL-2.0-only': ['Apache-2.0'],
};

export function detectLicenseConflicts(ids: string[], requireAll: boolean): LicenseConflict[] {
  const conflicts: LicenseConflict[] = [];
  if (!requireAll || ids.length < 2) return conflicts;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i];
      const b = ids[j];
      if (
        (incompatiblePairs[a] && incompatiblePairs[a].includes(b)) ||
        (incompatiblePairs[b] && incompatiblePairs[b].includes(a))
      ) {
        conflicts.push({
          licenses: [a, b],
          message: `${a} is not compatible with ${b}.`,
          remediation: 'Consider selecting a different license or separating components.',
        });
      } else if (strongCopyleft.has(a) && strongCopyleft.has(b) && a !== b) {
        conflicts.push({
          licenses: [a, b],
          message: `Multiple strong copyleft licenses detected: ${a} and ${b}.`,
          remediation: 'Review obligations and consider using a single copyleft license.',
        });
      }
    }
  }
  return conflicts;
}

// Pre-tokenize license texts for performance
const tokenizedLicenses: Record<string, Set<string>> = {};
for (const id of spdxLicenseIds) {
  const info: { licenseText?: string } | undefined = (licenseList as any)[id];
  const text = info?.licenseText || '';
  tokenizedLicenses[id] = tokenize(text);
}

export interface MatchOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export function matchLicense(
  licenseText: string,
  options: MatchOptions = {}
): LicenseMatchResult {
  const { signal, onProgress } = options;
  const inputTokens = tokenize(licenseText);
  const matches: LicenseMatch[] = [];
  const total = spdxLicenseIds.length;

  for (let i = 0; i < spdxLicenseIds.length; i += 1) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const id = spdxLicenseIds[i];
    const tokens = tokenizedLicenses[id];
    if (!tokens || tokens.size === 0) continue;
    const intersectionSize = [...inputTokens].filter((t) => tokens.has(t)).length;
    const unionSize = new Set([...inputTokens, ...tokens]).size;
    const confidence = unionSize === 0 ? 0 : intersectionSize / unionSize;
    const info = getLicenseInfo(id);
    matches.push({
      ...info,
      confidence,
    });
    onProgress?.(i + 1, total);
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  const top = matches[0];
  const second = matches[1];
  const ambiguous =
    !top ||
    top.confidence < 0.8 ||
    (second && second.confidence >= top.confidence - 0.05);
  const message = ambiguous
    ? 'Multiple potential licenses detected. Please review the matches to select the correct SPDX identifier.'
    : undefined;

  return { matches: matches.slice(0, 5), ambiguous, message };
}

