const severityValues = new Set(['low', 'medium', 'high', 'critical']);

const normalizeSeverity = (value, fallback = 'low') => {
  const normalized = `${value || ''}`.trim().toLowerCase();
  return severityValues.has(normalized) ? normalized : fallback;
};

const parseNumber = (value) => {
  const parsed = Number.parseFloat(`${value || ''}`.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parseEpss = (value) => {
  const text = `${value || ''}`.trim();
  if (!text) return null;
  const parsed = parseNumber(text.replace('%', ''));
  if (parsed === null) return null;
  if (text.endsWith('%') || parsed > 1) {
    return parsed / 100;
  }
  return parsed;
};

const blockToFinding = (block, indexMap) => {
  const title = block.Title || block.title || block.Description || block.description || 'Untitled finding';
  const severity = normalizeSeverity(block.Severity || block.severity);
  const impact = normalizeSeverity(block.Impact || block.impact, severity);
  const likelihood = normalizeSeverity(block.Likelihood || block.likelihood, severity);
  const keyBase = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${severity}`;
  const count = (indexMap[keyBase] || 0) + 1;
  indexMap[keyBase] = count;
  const cvss = parseNumber(block.CVSS || block.cvss);
  const epss = parseEpss(block.EPSS || block.epss);

  return {
    id: `${keyBase}-${count}`,
    severity,
    impact,
    likelihood,
    description: block.Description || block.description || title,
    ...(cvss !== null ? { cvss } : {}),
    ...(epss !== null ? { epss } : {}),
  };
};

const parseControlledBlocks = (text) => {
  const findings = [];
  const blocks = text.match(/--- FINDING ---[\s\S]*?--- END ---/g) || [];
  const indexMap = {};

  blocks.forEach((entry) => {
    const content = entry
      .replace('--- FINDING ---', '')
      .replace('--- END ---', '')
      .trim();

    const fields = content.split('\n').reduce((acc, line) => {
      const [rawKey, ...rest] = line.split(':');
      if (!rawKey || rest.length === 0) return acc;
      const key = rawKey.trim();
      const value = rest.join(':').trim();
      if (!key || !value) return acc;
      return { ...acc, [key]: value };
    }, {});

    if (Object.keys(fields).length > 0) {
      findings.push(blockToFinding(fields, indexMap));
    }
  });

  return findings;
};

const parseLegacyLines = (text) => {
  const lines = text.split('\n');
  const findings = [];
  const sevReg = /Severity:\s*(Low|Medium|High|Critical)/i;
  const impactReg = /Impact:\s*(Low|Medium|High|Critical)/i;
  const likelihoodReg = /Likelihood:\s*(Low|Medium|High|Critical)/i;

  lines.forEach((line, idx) => {
    const severityMatch = line.match(sevReg);
    const impactMatch = line.match(impactReg);
    const likelihoodMatch = line.match(likelihoodReg);
    if (severityMatch || impactMatch || likelihoodMatch) {
      const severity = normalizeSeverity(severityMatch?.[1]);
      findings.push({
        id: `line-${idx}-${severity}`,
        severity,
        impact: normalizeSeverity(impactMatch?.[1], severity),
        likelihood: normalizeSeverity(likelihoodMatch?.[1], severity),
        description: line.trim(),
      });
    }
  });

  return findings;
};

self.onmessage = (e) => {
  const text = e.data?.text || '';
  let findings = [];

  self.postMessage({ type: 'progress', data: 10 });
  findings = parseControlledBlocks(text);
  self.postMessage({ type: 'progress', data: 70 });

  if (findings.length === 0) {
    findings = parseLegacyLines(text);
  }

  self.postMessage({ type: 'progress', data: 100 });
  self.postMessage({ type: 'result', data: findings });
};
