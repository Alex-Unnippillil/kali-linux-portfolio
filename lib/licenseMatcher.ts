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
      ids.add(upper);
    }
  }
  return Array.from(ids);
}

// Pre-tokenize license texts for performance
const tokenizedLicenses: Record<string, Set<string>> = {};
for (const id of spdxLicenseIds) {
  const info: { licenseText?: string } | undefined = (licenseList as any)[id];
  const text = info?.licenseText || '';
  tokenizedLicenses[id] = tokenize(text);
}

export function matchLicense(licenseText: string): LicenseMatchResult {
  const inputTokens = tokenize(licenseText);
  const matches: LicenseMatch[] = [];

  for (const id of spdxLicenseIds) {
    const tokens = tokenizedLicenses[id];
    if (!tokens || tokens.size === 0) continue;
    const intersectionSize = [...inputTokens].filter(t => tokens.has(t)).length;
    const unionSize = new Set([...inputTokens, ...tokens]).size;
    const confidence = unionSize === 0 ? 0 : intersectionSize / unionSize;
    const info = getLicenseInfo(id);
    matches.push({
      ...info,
      confidence,
    });
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  const top = matches[0];
  const second = matches[1];
  const ambiguous = !top || top.confidence < 0.8 || (second && second.confidence >= top.confidence - 0.05);
  const message = ambiguous
    ? 'Multiple potential licenses detected. Please review the matches to select the correct SPDX identifier.'
    : undefined;

  return { matches: matches.slice(0, 5), ambiguous, message };
}

