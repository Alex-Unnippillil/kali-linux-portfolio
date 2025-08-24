import { parseSbomObject, fetchOsv, ParsedSbom } from '@lib/sbom';

let cancelled = false;
let controller: AbortController | null = null;

self.onmessage = async (e: MessageEvent<any>) => {
  const { type } = e.data;
  if (type === 'parse') {
    cancelled = false;
    controller = new AbortController();
    try {
      const file: File = e.data.file;
      const text = await file.text();
      if (cancelled) return;
      const data = JSON.parse(text);
      const parsed: ParsedSbom = parseSbomObject(data);
      const total = parsed.components.length;
      for (let i = 0; i < total; i += 1) {
        if (cancelled) break;
        await fetchOsv(parsed.components[i], controller.signal);
        (self as any).postMessage({
          type: 'progress',
          progress: (i + 1) / total,
        });
      }
      if (!cancelled) {
        (self as any).postMessage({ type: 'done', sbom: parsed });
      }
    } catch (err: any) {
      if (!cancelled) {
        (self as any).postMessage({
          type: 'error',
          error: err.message || String(err),
        });
      }
    }
  } else if (type === 'cancel') {
    cancelled = true;
    controller?.abort();
    (self as any).postMessage({ type: 'cancelled' });
  }
};

export {};
