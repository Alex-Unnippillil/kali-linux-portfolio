#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const allowlistPath = path.join(projectRoot, 'security', 'npm-audit-allowlist.json');

function exitWithError(message, code = 2) {
  console.error(`\n❌ ${message}`);
  process.exit(code);
}

if (!existsSync(allowlistPath)) {
  exitWithError(`Allowlist file not found at ${allowlistPath}.`);
}

let allowlistData;
try {
  const content = readFileSync(allowlistPath, 'utf8');
  allowlistData = JSON.parse(content);
} catch (error) {
  exitWithError(`Failed to read allowlist file: ${error.message}`);
}

const allowlistEntries = Array.isArray(allowlistData.allowlist) ? allowlistData.allowlist : [];

if (!Array.isArray(allowlistData.allowlist)) {
  exitWithError('Allowlist file must expose an "allowlist" array.');
}

const invalidEntries = [];
const now = new Date();
for (const entry of allowlistEntries) {
  const hasIdentifier = Boolean(entry?.id || entry?.module || entry?.cve || entry?.path);
  if (!hasIdentifier) {
    invalidEntries.push({ entry, reason: 'missing identifier (id/module/cve/path)' });
    continue;
  }
  if (!entry.reason || typeof entry.reason !== 'string' || !entry.reason.trim()) {
    invalidEntries.push({ entry, reason: 'missing rationale in "reason" field' });
    continue;
  }
  if (entry.expires) {
    const expiration = new Date(entry.expires);
    if (Number.isNaN(expiration.getTime())) {
      invalidEntries.push({ entry, reason: `invalid expires value (${entry.expires})` });
      continue;
    }
    if (expiration < now) {
      invalidEntries.push({ entry, reason: `expired on ${entry.expires}` });
    }
  }
}

if (invalidEntries.length > 0) {
  console.error('Found invalid allowlist entries:');
  for (const { entry, reason } of invalidEntries) {
    console.error(` - ${JSON.stringify(entry)} => ${reason}`);
  }
  process.exit(2);
}

const cliArgs = process.argv.slice(2);
let reportMode = false;
let silentFailure = false;
const passThroughArgs = [];

for (const arg of cliArgs) {
  if (arg === '--report') {
    reportMode = true;
    continue;
  }
  if (arg === '--no-fail') {
    silentFailure = true;
    continue;
  }
  passThroughArgs.push(arg);
}

const severityRank = new Map([
  ['info', 0],
  ['low', 1],
  ['moderate', 2],
  ['medium', 2],
  ['high', 3],
  ['critical', 4],
]);

const auditArgs = ['npm', 'audit', '--json', '--recursive', ...passThroughArgs];
const auditResult = spawnSync('yarn', auditArgs, { encoding: 'utf8' });

if (auditResult.error) {
  exitWithError(`Failed to run yarn npm audit: ${auditResult.error.message}`);
}

const rawOutputs = [auditResult.stdout, auditResult.stderr]
  .map((value) => (typeof value === 'string' ? value.trim() : ''))
  .filter(Boolean);

function tryParseJson(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      return null;
    }
    const parsedLines = [];
    for (const line of lines) {
      try {
        parsedLines.push(JSON.parse(line));
      } catch (nestedError) {
        return null;
      }
    }
    return parsedLines;
  }
}

let parsedPayload = null;
for (const candidate of rawOutputs) {
  parsedPayload = tryParseJson(candidate);
  if (parsedPayload) break;
}

if (!parsedPayload) {
  if (auditResult.status && auditResult.status !== 0) {
    console.error('Raw audit output could not be parsed:');
    console.error(rawOutputs.join('\n'));
    exitWithError('Unable to parse yarn npm audit output.');
  }
  if (reportMode) {
    console.log('## npm audit\n\nNo vulnerabilities reported.');
  } else {
    console.log('No vulnerabilities reported by yarn npm audit.');
  }
  process.exit(0);
}

function normalizeAdvisory(advisory) {
  const identifier = advisory.github_advisory_id || advisory.cves?.[0] || advisory.id;
  const paths = [];
  if (Array.isArray(advisory.findings)) {
    for (const finding of advisory.findings) {
      if (Array.isArray(finding.paths)) {
        paths.push(...finding.paths);
      }
      if (typeof finding.path === 'string') {
        paths.push(finding.path);
      }
    }
  }
  return {
    id: identifier ? String(identifier) : null,
    module: advisory.module_name || advisory.module || advisory.name || null,
    severity: (advisory.severity || '').toLowerCase(),
    title: advisory.title || advisory.overview || '',
    url: advisory.url || (Array.isArray(advisory.references) ? advisory.references[0] : ''),
    cves: Array.isArray(advisory.cves) ? advisory.cves : [],
    paths,
    range: advisory.vulnerable_versions || advisory.affected_versions || '',
    extra: advisory,
  };
}

function normalizeViaEntry(base, via) {
  if (typeof via === 'string') {
    return {
      ...base,
      id: via,
      title: via,
      cves: via.startsWith('CVE') ? [via] : [],
    };
  }
  if (via && typeof via === 'object') {
    const id = via.source || via.id || via.url || via.name || base.id || null;
    const severity = (via.severity || base.severity || '').toLowerCase();
    const paths = [];
    if (Array.isArray(via.nodes)) {
      paths.push(...via.nodes);
    }
    if (via.dependency) {
      paths.push(via.dependency);
    }
    return {
      ...base,
      id,
      severity,
      title: via.title || via.name || base.title || '',
      url: via.url || base.url || '',
      cves: Array.isArray(via.cves) ? via.cves : base.cves,
      paths: paths.length ? Array.from(new Set([...(base.paths || []), ...paths])) : base.paths,
      range: via.range || base.range,
      extra: via,
    };
  }
  return base;
}

function normalizeModernVulnerability(name, vulnerability) {
  const base = {
    id: name,
    module: vulnerability.name || name,
    severity: (vulnerability.severity || '').toLowerCase(),
    title: '',
    url: '',
    cves: [],
    paths: [],
    range: vulnerability.range || '',
    extra: vulnerability,
  };
  const results = [];
  if (Array.isArray(vulnerability.via) && vulnerability.via.length > 0) {
    for (const via of vulnerability.via) {
      results.push(normalizeViaEntry({ ...base }, via));
    }
  } else {
    results.push(base);
  }
  return results;
}

function extractVulnerabilities(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    const flattened = [];
    for (const entry of payload) {
      if (entry?.type === 'auditAdvisory' && entry.data?.advisory) {
        flattened.push(normalizeAdvisory(entry.data.advisory));
      } else if (entry?.type === 'auditSummary' && entry.data?.vulnerabilities) {
        flattened.push(...extractVulnerabilities(entry.data));
      } else {
        flattened.push(...extractVulnerabilities(entry));
      }
    }
    return flattened.flat();
  }
  if (payload.advisories && typeof payload.advisories === 'object') {
    return Object.values(payload.advisories).map(normalizeAdvisory);
  }
  if (payload.vulnerabilities && typeof payload.vulnerabilities === 'object') {
    const vulns = [];
    for (const [name, vulnerability] of Object.entries(payload.vulnerabilities)) {
      vulns.push(...normalizeModernVulnerability(name, vulnerability));
    }
    return vulns;
  }
  if (payload.data) {
    return extractVulnerabilities(payload.data);
  }
  if (payload.auditReportVersion && payload.vulnerabilities) {
    return extractVulnerabilities({ vulnerabilities: payload.vulnerabilities });
  }
  return [];
}

const vulnerabilities = extractVulnerabilities(parsedPayload);

const normalizeSeverity = (severity) => (severity ? severity.toLowerCase() : 'unknown');
for (const vuln of vulnerabilities) {
  vuln.severity = normalizeSeverity(vuln.severity);
  if (!severityRank.has(vuln.severity)) {
    severityRank.set(vuln.severity, severityRank.get('info'));
  }
}

const isAllowlisted = (vuln) => {
  return allowlistEntries.some((entry) => {
    const idMatch = entry.id && vuln.id && entry.id.toLowerCase() === String(vuln.id).toLowerCase();
    const moduleMatch = entry.module && vuln.module && entry.module === vuln.module;
    const cveMatch = entry.cve && Array.isArray(vuln.cves) && vuln.cves.some((cve) => cve.toLowerCase() === entry.cve.toLowerCase());
    const pathMatch = entry.path && Array.isArray(vuln.paths) && vuln.paths.includes(entry.path);
    return Boolean(idMatch || moduleMatch || cveMatch || pathMatch);
  });
};

const highSeverityThreshold = severityRank.get('high');

const highVulns = vulnerabilities.filter((vuln) => (severityRank.get(vuln.severity) ?? 0) >= highSeverityThreshold);
const highNotAllowlisted = highVulns.filter((vuln) => !isAllowlisted(vuln));
const highAllowlisted = highVulns.filter((vuln) => isAllowlisted(vuln));

const otherVulns = vulnerabilities.filter((vuln) => !highVulns.includes(vuln));

function formatVulnerability(vuln) {
  const lines = [];
  const identifier = vuln.id || 'unidentified';
  lines.push(`- **${identifier}** (${vuln.severity || 'unknown'}) in \`${vuln.module || 'unknown package'}\``);
  if (vuln.title) {
    lines.push(`  - ${vuln.title}`);
  }
  if (vuln.url) {
    lines.push(`  - ${vuln.url}`);
  }
  if (vuln.range) {
    lines.push(`  - Affected versions: ${vuln.range}`);
  }
  if (Array.isArray(vuln.paths) && vuln.paths.length > 0) {
    const sampledPaths = vuln.paths.slice(0, 3);
    lines.push(`  - Dependency paths: ${sampledPaths.join(', ')}${vuln.paths.length > sampledPaths.length ? '…' : ''}`);
  }
  return lines.join('\n');
}

function renderReport() {
  const summaryLines = [];
  summaryLines.push('## npm audit report');
  summaryLines.push('');
  if (vulnerabilities.length === 0) {
    summaryLines.push('No vulnerabilities reported.');
    return summaryLines.join('\n');
  }
  summaryLines.push(`Total vulnerabilities: **${vulnerabilities.length}**`);
  summaryLines.push(`- High severity (unallowlisted): **${highNotAllowlisted.length}**`);
  summaryLines.push(`- High severity (allowlisted): **${highAllowlisted.length}**`);
  summaryLines.push(`- Other severities: **${otherVulns.length}**`);
  summaryLines.push('');
  if (highNotAllowlisted.length > 0) {
    summaryLines.push('### ❗ Action required: High severity vulnerabilities');
    summaryLines.push('');
    for (const vuln of highNotAllowlisted) {
      summaryLines.push(formatVulnerability(vuln));
      summaryLines.push('');
    }
  }
  if (highAllowlisted.length > 0) {
    summaryLines.push('### ✅ Allowlisted high severity vulnerabilities');
    summaryLines.push('');
    for (const vuln of highAllowlisted) {
      summaryLines.push(formatVulnerability(vuln));
      const matchingEntries = allowlistEntries.filter((entry) => (entry.id && vuln.id && entry.id.toLowerCase() === vuln.id.toLowerCase()) || (entry.module && vuln.module && entry.module === vuln.module) || (entry.cve && Array.isArray(vuln.cves) && vuln.cves.some((cve) => cve.toLowerCase() === entry.cve.toLowerCase())) || (entry.path && Array.isArray(vuln.paths) && vuln.paths.includes(entry.path)));
      if (matchingEntries.length > 0) {
        for (const match of matchingEntries) {
          summaryLines.push(`  - Allowlist reason: ${match.reason}`);
          if (match.expires) {
            summaryLines.push(`  - Allowlist expires: ${match.expires}`);
          }
        }
      }
      summaryLines.push('');
    }
  }
  if (otherVulns.length > 0) {
    summaryLines.push('### ℹ️ Other vulnerabilities');
    summaryLines.push('');
    for (const vuln of otherVulns) {
      summaryLines.push(formatVulnerability(vuln));
      summaryLines.push('');
    }
  }
  return summaryLines.join('\n');
}

if (reportMode) {
  console.log(renderReport());
}

if (highNotAllowlisted.length > 0) {
  const header = reportMode ? '\nHigh severity vulnerabilities require attention:' : 'High severity vulnerabilities require attention:';
  console.error(header);
  for (const vuln of highNotAllowlisted) {
    console.error(formatVulnerability(vuln));
  }
  if (silentFailure) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (!reportMode) {
  if (highAllowlisted.length > 0) {
    console.log('High severity vulnerabilities are present but allowlisted:');
    for (const vuln of highAllowlisted) {
      console.log(formatVulnerability(vuln));
    }
  }
  if (otherVulns.length > 0) {
    console.log('Other vulnerabilities detected:');
    for (const vuln of otherVulns) {
      console.log(formatVulnerability(vuln));
    }
  }
  if (vulnerabilities.length === 0) {
    console.log('No vulnerabilities reported by yarn npm audit.');
  }
}

process.exit(0);
