/// <reference lib="webworker" />
import PCRE from '@stephen-riley/pcre2-wasm';

let initPromise: Promise<void> | null = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = PCRE.init();
  }
  return initPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { pattern, text } = e.data as { pattern: string; text: string };
  await ensureInit();
  const start = performance.now();
  let matches: any = null;
  let error: string | undefined;
  const heat = new Array(text.length).fill(0);
  try {
    const re = new PCRE(pattern, 'g');
    for (let i = 0; i < text.length; i++) {
      const m = re.match(text, i);
      heat[i]++;
      if (m) {
        matches = matches || [];
        matches.push(m);
      }
    }
    re.destroy();
  } catch (err: any) {
    error = err.message;
  }
  const time = performance.now() - start;
  (self as any).postMessage({ matches, time, error, heat });
};
