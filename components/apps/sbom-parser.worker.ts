import { parseSbomObject } from '@lib/sbom';

let cancelled = false;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;
  if (type === 'parse') {
    cancelled = false;
    const file: File = e.data.file;
    try {
      let text = '';
      const total = (file as any).size || 0;
      if (typeof (file as any).stream === 'function') {
        const reader = (file as any).stream().getReader();
        const decoder = new TextDecoder();
        let loaded = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (cancelled) {
            (self as any).postMessage({ type: 'cancelled' });
            return;
          }
          loaded += value.length;
          text += decoder.decode(value, { stream: true });
          (self as any).postMessage({ type: 'progress', progress: total ? loaded / total : 0 });
        }
        text += decoder.decode();
      } else {
        text = await (file as any).text();
        (self as any).postMessage({ type: 'progress', progress: 1 });
      }
      if (cancelled) {
        (self as any).postMessage({ type: 'cancelled' });
        return;
      }
      const data = JSON.parse(text);
      const parsed = parseSbomObject(data);
      (self as any).postMessage({ type: 'done', sbom: parsed });
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: err.message || String(err) });
    }
  } else if (type === 'cancel') {
    cancelled = true;
  }
};

export {};
