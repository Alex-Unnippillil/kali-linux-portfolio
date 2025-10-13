self.onmessage = (e: MessageEvent<string>) => {
  const code = e.data;
  const send = (type: string, message: string) => {
    (self as any).postMessage({ type, message });
  };
  const original: Record<string, any> = {};
  ['log', 'error', 'warn', 'info'].forEach((key) => {
    original[key] = console[key as keyof Console];
    (console as any)[key] = (...args: any[]) => {
      send('console', args.map((a) => String(a)).join(' '));
      original[key](...args);
    };
  });
  try {
    const result = new Function(code)();
    if (result !== undefined) {
      send('result', String(result));
    }
  } catch (err: any) {
    send('error', err.message || String(err));
  } finally {
    Object.assign(console, original);
  }
};
