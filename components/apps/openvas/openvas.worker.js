self.onmessage = (e) => {
  const text = e.data || '';
  const lines = text.split('\n');
  const findings = [];
  const severities = ['low', 'medium', 'high', 'critical'];
  const sevReg = /Severity:\s*(Low|Medium|High|Critical)/i;
  const impactReg = /Impact:\s*(Low|Medium|High|Critical)/i;
  const likelihoodReg = /Likelihood:\s*(Low|Medium|High|Critical)/i;
  const hostReg = /Host:\s*(\S+)/i;
  let currentHost = '';

  lines.forEach((line) => {
    const hostMatch = line.match(hostReg);
    if (hostMatch) {
      currentHost = hostMatch[1];
      return;
    }

    const severityMatch = line.match(sevReg);
    const impactMatch = line.match(impactReg);
    const likelihoodMatch = line.match(likelihoodReg);
    if (severityMatch || impactMatch || likelihoodMatch) {
      const sev = severityMatch ? severityMatch[1].toLowerCase() : 'low';
      findings.push({
        host: currentHost,
        severity: sev,
        impact: impactMatch ? impactMatch[1].toLowerCase() : sev,
        likelihood: likelihoodMatch ? likelihoodMatch[1].toLowerCase() : sev,
        description: line.trim(),
      });
    }
  });
  self.postMessage(findings);
};
