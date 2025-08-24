import yaraFactory from 'libyara-wasm';

interface MatchDetail {
  rule: string;
  tags?: string[];
  meta?: Record<string, string>;
  matches: { identifier: string; data: string; offset: number; length: number }[];
}

interface CompileError {
  message: string;
  line?: number;
  warning?: boolean;
}

let yara: any;

(async () => {
  const m = await (yaraFactory as any).default?.() ?? (yaraFactory as any)();
  yara = m;
  (self as any).postMessage({ type: 'ready' });
})();

const resolveIncludes = (files: Record<string, string>): string => {
  const cache: Record<string, string> = {};
  const resolve = (name: string, stack: string[] = []): string => {
    if (cache[name]) return cache[name];
    const src = files[name];
    if (src === undefined) return '';
    if (stack.includes(name)) return '';
    const out = src.replace(/include\s+"([^"]+)"/g, (_m, inc) => resolve(inc, [...stack, name]));
    cache[name] = out;
    return out;
  };
  return Object.keys(files)
    .map((k) => resolve(k))
    .join('\n');
};

const runYara = (input: string, files: Record<string, string>) => {
  const rules = resolveIncludes(files);
  const res = yara.run(input, rules);
  const ruleVec = res.matchedRules;
  const found: MatchDetail[] = [];
  for (let i = 0; i < ruleVec.size(); i += 1) {
    const r = ruleVec.get(i);
    const det: MatchDetail['matches'] = [];
    const rm = r.resolvedMatches;
    for (let j = 0; j < rm.size(); j += 1) {
      const m = rm.get(j);
      det.push({
        identifier: m.stringIdentifier,
        data: m.data,
        offset: m.location,
        length: m.matchLength,
      });
    }
    const meta: Record<string, string> = {};
    const metas = r.metas;
    if (metas) {
      for (let k = 0; k < metas.size(); k += 1) {
        const m = metas.get(k);
        meta[m.id] = m.value;
      }
    }
    const tags: string[] = [];
    const tagVec = r.ruleTags;
    if (tagVec) {
      for (let k = 0; k < tagVec.size(); k += 1) tags.push(tagVec.get(k));
    }
    found.push({ rule: r.ruleName, matches: det, meta, tags });
  }
  const errVec = res.compileErrors;
  const errArr: CompileError[] = [];
  for (let i = 0; i < errVec.size(); i += 1) {
    const e = errVec.get(i);
    errArr.push({ message: e.message, line: e.lineNumber, warning: e.warning });
  }
  return { matches: found, compileErrors: errArr };
};

self.onmessage = (ev: MessageEvent) => {
  const data: any = ev.data;
  if (!yara) return;
  if (data.type === 'run') {
    try {
      const start = performance.now();
      const result = runYara(data.input, data.rules);
      const elapsed = performance.now() - start;
      (self as any).postMessage({ type: 'result', elapsed, ...result });
    } catch (e) {
      (self as any).postMessage({ type: 'runtimeError', error: String(e) });
    }
  } else if (data.type === 'lint') {
    try {
      const result = runYara('', data.rules);
      (self as any).postMessage({ type: 'lintResult', errors: result.compileErrors });
    } catch (e) {
      (self as any).postMessage({ type: 'lintResult', errors: [{ message: String(e) }] });
    }
  }
};
