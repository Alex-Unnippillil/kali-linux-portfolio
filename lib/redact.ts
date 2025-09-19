export interface RedactionStats {
  emails: number;
  ipAddresses: number;
  ids: number;
  total: number;
}

export interface RedactionResult {
  text: string;
  stats: RedactionStats;
}

const EMAIL_PLACEHOLDER = '<email>';
const IP_PLACEHOLDER = '<ip>';
const ID_PLACEHOLDER = '<id>';

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ipv4Pattern = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
// Basic IPv6 pattern that matches full and compressed forms.
const ipv6Pattern = /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b|\b(?:(?:[A-F0-9]{1,4}:){1,7}|:)(?::[A-F0-9]{1,4}){1,7}\b/gi;
const jsonIdPattern = /"((?:[A-Za-z]+)?(?:[Ii][Dd]))"\s*:\s*"([^"]+)"/g;
const labeledIdWithSepPattern = /\b((?:[A-Za-z]+[-_ ]*)?(?:ID|Id|id))\s*([:=])\s*([A-Za-z0-9-]{3,})/g;
const labeledIdSpacePattern = /\b((?:[A-Za-z]+[-_ ]*)?(?:ID|Id|id))\s+([A-Za-z0-9-]{3,})\b/g;
const guidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function createStats(): RedactionStats {
  return { emails: 0, ipAddresses: 0, ids: 0, total: 0 };
}

function increment(stats: RedactionStats, key: keyof Omit<RedactionStats, 'total'>) {
  stats[key] += 1;
  stats.total += 1;
}

export function redactSensitive(input: string | null | undefined): RedactionResult {
  let text = input ?? '';
  const stats = createStats();

  text = text.replace(emailPattern, () => {
    increment(stats, 'emails');
    return EMAIL_PLACEHOLDER;
  });

  text = text.replace(ipv4Pattern, () => {
    increment(stats, 'ipAddresses');
    return IP_PLACEHOLDER;
  });

  text = text.replace(ipv6Pattern, () => {
    increment(stats, 'ipAddresses');
    return IP_PLACEHOLDER;
  });

  text = text.replace(jsonIdPattern, (_, label: string) => {
    increment(stats, 'ids');
    return `"${label}": "${ID_PLACEHOLDER}"`;
  });

  text = text.replace(labeledIdWithSepPattern, (_, label: string, sep: string) => {
    increment(stats, 'ids');
    return `${label}${sep} ${ID_PLACEHOLDER}`;
  });

  text = text.replace(labeledIdSpacePattern, (_, label: string) => {
    increment(stats, 'ids');
    return `${label} ${ID_PLACEHOLDER}`;
  });

  text = text.replace(guidPattern, () => {
    increment(stats, 'ids');
    return ID_PLACEHOLDER;
  });

  return { text, stats };
}

export function logRedactionSummary(stats: RedactionStats, context?: string) {
  if (stats.total === 0) return;
  const prefix = context ? `[redaction:${context}]` : '[redaction]';
  console.info(`${prefix} masked ${stats.total} value(s)`, stats);
}
