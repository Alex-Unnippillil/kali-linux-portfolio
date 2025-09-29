interface LintMessage {
  line: number;
  message: string;
}

const lintEttercapFilter = (code: string): LintMessage[] => {
  const messages: LintMessage[] = [];
  const lines = code.split(/\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const [command, ...rest] = trimmed.split(/\s+/);
    const lineNumber = idx + 1;

    if (command !== 'drop' && command !== 'replace') {
      messages.push({
        line: lineNumber,
        message: `Unknown command "${command}"`,
      });
      return;
    }

    if (command === 'drop') {
      if (rest.length === 0) {
        messages.push({
          line: lineNumber,
          message: 'drop requires a pattern to remove',
        });
      }
      return;
    }

    if (rest.length < 2) {
      messages.push({
        line: lineNumber,
        message: 'replace requires a pattern and a replacement',
      });
    } else if (rest.length > 2) {
      messages.push({
        line: lineNumber,
        message: 'replace only accepts two parameters',
      });
    }
  });

  return messages;
};

self.onmessage = (event: MessageEvent<{ type: string; code: string }>) => {
  const { type, code } = event.data || {};
  if (type !== 'lint') return;

  const messages = lintEttercapFilter(code || '');
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({
    type: 'lint',
    messages,
  });
};

export {};
