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
  column?: number;
  warning?: boolean;
}

let yara: any;

(async () => {
  const m = await (yaraFactory as any).default?.() ?? (yaraFactory as any)();
  yara = m;
  (self as any).postMessage({ type: 'ready' });
})();

const resolveIncludes = (files: Record<string, string>): { code: string; missing: string[] } => {
  const cache: Record<string, string> = {};
  const missing: string[] = [];
  const resolve = (name: string, stack: string[] = []): string => {
    if (cache[name]) return cache[name];
    const src = files[name];
    if (src === undefined) {
      missing.push(name);
      return '';
    }
    if (stack.includes(name)) return '';
    const out = src.replace(/include\s+"([^"]+)"/g, (_m, inc) => resolve(inc, [...stack, name]));
    cache[name] = out;
    return out;
  };
  const code = Object.keys(files)
    .map((k) => resolve(k))
    .join('\n');
  return { code, missing };
};

const runYara = (
  input: string,
  files: Record<string, string>,
  onMatch?: (m: MatchDetail) => void,
) => {
  const { code, missing } = resolveIncludes(files);
  const res = yara.run(input, code);
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
    const metas = (r as any).metas || (r as any).metadata;
    if (metas) {
      for (let k = 0; k < metas.size(); k += 1) {
        const m = metas.get(k);
        const id = (m as any).id ?? (m as any).identifier;
        const val = (m as any).value ?? (m as any).data;
        meta[id] = val;
      }
    }
    const tags: string[] = [];
    const tagVec = r.ruleTags;
    if (tagVec) {
      for (let k = 0; k < tagVec.size(); k += 1) tags.push(tagVec.get(k));
    }
    const match: MatchDetail = { rule: r.ruleName, matches: det, meta, tags };
    onMatch?.(match);
    found.push(match);
  }
  const errVec = res.compileErrors;
  const errArr: CompileError[] = [];
  for (let i = 0; i < errVec.size(); i += 1) {
    const e = errVec.get(i);
    errArr.push({
      message: e.message,
      line: e.lineNumber,
      column: (e as any).columnNumber,
      warning: e.warning,
    });
  }
  missing.forEach((m) => errArr.push({ message: `missing include: ${m}` }));
  return { matches: found, compileErrors: errArr };
};

self.onmessage = (ev: MessageEvent) => {
  const data: any = ev.data;
  if (!yara) return;
  if (data.type === 'run') {
    let aborted = false;
    const limits = data.limits || {};
    const timer =
      limits.cpu !== undefined
        ? setTimeout(() => {
            aborted = true;
            (self as any).postMessage({ type: 'runtimeError', error: 'CPU limit exceeded' });
          }, limits.cpu)
        : null;
    try {
      const start = performance.now();
      const result = runYara(data.input, data.rules, (m) => {
        (self as any).postMessage({ type: 'match', match: m });
        if (
          limits.mem &&
          (performance as any).memory &&
          (performance as any).memory.usedJSHeapSize > limits.mem
        ) {
          aborted = true;
          throw new Error('Memory limit exceeded');
        }
      });
      const elapsed = performance.now() - start;
      if (!aborted) (self as any).postMessage({ type: 'result', elapsed, ...result });
    } catch (e) {
      if (!aborted) (self as any).postMessage({ type: 'runtimeError', error: String(e) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  } else if (data.type === 'runCorpus') {
    const limits = data.limits || {};
    const heatmap: Record<string, number> = {};
    const compileErrors: CompileError[] = [];
    let aborted = false;
    const timer =
      limits.cpu !== undefined
        ? setTimeout(() => {
            aborted = true;
            (self as any).postMessage({ type: 'runtimeError', error: 'CPU limit exceeded' });
          }, limits.cpu)
        : null;
    try {
      for (const file of data.corpus as { name: string; data: string }[]) {
        const start = performance.now();
        const res = runYara(file.data, data.rules, (m) => {
          (self as any).postMessage({ type: 'match', file: file.name, match: m });
          heatmap[m.rule] = (heatmap[m.rule] || 0) + 1;
          if (
            limits.mem &&
            (performance as any).memory &&
            (performance as any).memory.usedJSHeapSize > limits.mem
          ) {
            aborted = true;
            throw new Error('Memory limit exceeded');
          }
        });
        compileErrors.push(...res.compileErrors);
        const elapsed = performance.now() - start;
        (self as any).postMessage({ type: 'fileResult', file: file.name, elapsed });
        if (aborted) break;
      }
      if (!aborted)
        (self as any).postMessage({ type: 'corpusDone', heatmap, compileErrors });
    } catch (e) {
      if (!aborted) (self as any).postMessage({ type: 'runtimeError', error: String(e) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  } else if (data.type === 'scanFiles') {
    const limits = data.limits || {};
    const heatmap: Record<string, number> = {};
    let aborted = false;
    const timer =
      limits.cpu !== undefined
        ? setTimeout(() => {
            aborted = true;
            (self as any).postMessage({ type: 'runtimeError', error: 'CPU limit exceeded' });
          }, limits.cpu)
        : null;
    const chunkSize: number = data.chunkSize || 1024 * 1024;
    try {
      const compileCheck = runYara('', data.rules);
      const compileErrors = compileCheck.compileErrors;
      if (compileErrors.length > 0) {
        (self as any).postMessage({ type: 'corpusDone', heatmap, compileErrors });
        return;
      }
      for (const handle of data.handles as any[]) {
        const file = await (handle as any).getFile();
        let offset = 0;
        const start = performance.now();
        for (let pos = 0; pos < file.size && !aborted; pos += chunkSize) {
          const chunk = await file.slice(pos, pos + chunkSize).text();
          runYara(chunk, data.rules, (m) => {
            m.matches = m.matches.map((d) => ({ ...d, offset: d.offset + offset }));
            (self as any).postMessage({ type: 'match', file: file.name, match: m });
            heatmap[m.rule] = (heatmap[m.rule] || 0) + 1;
            if (
              limits.mem &&
              (performance as any).memory &&
              (performance as any).memory.usedJSHeapSize > limits.mem
            ) {
              aborted = true;
              throw new Error('Memory limit exceeded');
            }
          });
          offset += chunk.length;
        }
        const elapsed = performance.now() - start;
        (self as any).postMessage({ type: 'fileResult', file: file.name, elapsed });
        if (aborted) break;
      }
      if (!aborted) (self as any).postMessage({ type: 'corpusDone', heatmap, compileErrors: [] });
    } catch (e) {
      if (!aborted) (self as any).postMessage({ type: 'runtimeError', error: String(e) });
    } finally {
      if (timer) clearTimeout(timer);
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
