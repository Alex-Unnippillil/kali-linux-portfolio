const lintCode = (code: string) => {
  const messages: { line: number; message: string }[] = [];
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.startsWith('//')
    ) {
      messages.push({ line: idx + 1, message: 'Missing semicolon' });
    }
    if (/\bvar\s+/.test(trimmed)) {
      messages.push({ line: idx + 1, message: 'Unexpected var, use let or const' });
    }
  });
  return messages;
};

self.onmessage = async (e: MessageEvent<{ type: string; code: string }>) => {
  const { type, code } = e.data;
  if (type === 'format') {
    const prettier = (await import('prettier/standalone')).default;
    const parserBabel = (await import('prettier/plugins/babel')).default;
    const formatted = await prettier.format(code, {
      parser: 'babel',
      plugins: [parserBabel],
    });
    (self as any).postMessage({ type: 'format', formatted });
  } else if (type === 'lint') {
    const messages = lintCode(code);
    (self as any).postMessage({ type: 'lint', messages });
  }
};
