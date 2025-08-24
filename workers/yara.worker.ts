import * as Comlink from 'comlink';
import yaraFactory from 'libyara-wasm';

let yaraInstance: any;

async function getYara() {
  if (!yaraInstance) {
    // libyara-wasm may export default or factory function
    yaraInstance = await (yaraFactory as any).default?.() ?? (yaraFactory as any)();
  }
  return yaraInstance;
}

async function scan(rules: string, stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const yara = await getYara();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let lastYield = performance.now();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
    if (performance.now() - lastYield > 40) {
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.length;
  }
  const data = new TextDecoder().decode(buffer);
  const res = yara.run(data, rules);
  const matches: string[] = [];
  const matched = res.matchedRules;
  for (let i = 0; i < matched.size(); i++) {
    matches.push(matched.get(i).ruleName);
  }
  return matches;
}

Comlink.expose({ scan });
