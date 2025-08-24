/// <reference lib="webworker" />
import { RE2 } from 're2-wasm';
import PCRE from '@stephen-riley/pcre2-wasm';

let pcreInit: Promise<void> | null = null;
function ensurePcre() {
  if (!pcreInit) {
    pcreInit = PCRE.init();
  }
  return pcreInit;
}

self.onmessage = async (e: MessageEvent) => {
  const { pattern, text, engine } = e.data as {
    pattern: string;
    text: string;
    engine: 're2' | 'pcre';
  };

  let matches: string[] = [];
  let error: string | undefined;
  const start = performance.now();

  try {
    if (engine === 'pcre') {
      await ensurePcre();
      const re = new PCRE(pattern, 'g');
      for (let i = 0; i < text.length; i++) {
        const m = re.match(text, i);
        if (m) {
          matches.push(m[0]);
          (self as any).postMessage({ engine, event: 'match', match: m[0] });
        }
        if (performance.now() - start > 50) {
          (self as any).postMessage({
            engine,
            event: 'timeout',
            time: performance.now() - start,
            matches,
          });
          return;
        }
      }
      re.destroy();
    } else {
      const re = new RE2(pattern, 'gu');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        matches.push(m[0]);
        (self as any).postMessage({ engine, event: 'match', match: m[0] });
        if (performance.now() - start > 50) {
          (self as any).postMessage({
            engine,
            event: 'timeout',
            time: performance.now() - start,
            matches,
          });
          return;
        }
      }
    }
  } catch (err: any) {
    error = err.message;
  }

  const time = performance.now() - start;
  (self as any).postMessage({ engine, event: 'done', time, matches, error });
};

