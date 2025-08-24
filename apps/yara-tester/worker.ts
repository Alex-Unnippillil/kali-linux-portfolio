import yaraFactory from 'libyara-wasm';

interface MatchDetail {
  rule: string;
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

const runYara = (input: string, rules: string) => {
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
    found.push({ rule: r.ruleName, matches: det });
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
      const result = runYara(data.input, data.rules);
      (self as any).postMessage({ type: 'result', ...result });
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
