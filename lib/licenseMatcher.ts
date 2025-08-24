import spdxLicenseIds from 'spdx-license-ids';
import licenseList from 'spdx-license-list/full';

export interface LicenseMatch {
  spdxId: string;
  confidence: number;
  url: string;
}

export interface LicenseMatchResult {
  matches: LicenseMatch[];
  ambiguous: boolean;
  message?: string;
}

const TOKEN_REGEX = /\b[a-z0-9]+\b/g;

function tokenize(text: string): Set<string> {
  return new Set((text.toLowerCase().match(TOKEN_REGEX)) || []);
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
    matches.push({
      spdxId: id,
      confidence,
      url: `https://spdx.org/licenses/${id}.html`,
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

