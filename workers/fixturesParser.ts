let cancelled = false;

self.onmessage = (e: MessageEvent) => {
  const { type, text } = e.data as { type: string; text?: string };
  if (type === 'cancel') {
    cancelled = true;
    return;
  }
  if (type === 'parse' && text) {
    cancelled = false;
    const lines = text.split(/\n/);
    const total = lines.length;
    const result: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) return;
      const line = lines[i].trim();
      if (!line) continue;
      try {
        result.push(JSON.parse(line));
      } catch {
        result.push({ line });
      }
      if (i % 100 === 0) {
        (self as any).postMessage({ type: 'progress', payload: Math.round((i / total) * 100) });
      }
    }
    (self as any).postMessage({ type: 'progress', payload: 100 });
    (self as any).postMessage({ type: 'result', payload: result });
  }
};

export {}; // ensure module scope
