self.onmessage = (e) => {
  const text = e.data?.text || '';
  const lines = text.split('\n');
  const findings = [];
  const sevReg = /Severity:\s*(Low|Medium|High|Critical)/i;
  const impactReg = /Impact:\s*(Low|Medium|High|Critical)/i;
  const likelihoodReg = /Likelihood:\s*(Low|Medium|High|Critical)/i;
  const total = lines.length;
  lines.forEach((line, idx) => {
    const severityMatch = line.match(sevReg);
    const impactMatch = line.match(impactReg);
    const likelihoodMatch = line.match(likelihoodReg);
    if (severityMatch || impactMatch || likelihoodMatch) {
      const sev = severityMatch ? severityMatch[1].toLowerCase() : 'low';
      findings.push({
        severity: sev,
        impact: impactMatch ? impactMatch[1].toLowerCase() : sev,
        likelihood: likelihoodMatch ? likelihoodMatch[1].toLowerCase() : sev,
        description: line.trim(),
      });
    }
    if (idx % 50 === 0) {
      self.postMessage({
        type: 'progress',
        data: Math.round((idx / total) * 100),
      });
    }
  });
  self.postMessage({ type: 'progress', data: 100 });
  self.postMessage({ type: 'result', data: findings });
};
